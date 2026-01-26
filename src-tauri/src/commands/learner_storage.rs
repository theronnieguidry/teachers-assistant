use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::path::PathBuf;
use tokio::fs;

const LEARNERS_DIR: &str = "learners";
const PROFILES_FILE: &str = "profiles.json";
const MASTERY_FILE: &str = "mastery.json";

// Helper to get the learners directory
fn get_learners_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    Ok(app_data_dir.join(LEARNERS_DIR))
}

// Helper to get the profiles file path
fn get_profiles_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(get_learners_dir(app_handle)?.join(PROFILES_FILE))
}

// Helper to get a learner's data directory
fn get_learner_dir(app_handle: &tauri::AppHandle, learner_id: &str) -> Result<PathBuf, String> {
    Ok(get_learners_dir(app_handle)?.join(learner_id))
}

// ============================================
// Profile Commands
// ============================================

/// Get all learner profiles
#[tauri::command]
pub async fn get_learner_profiles(app_handle: tauri::AppHandle) -> Result<String, String> {
    let profiles_path = get_profiles_path(&app_handle)?;

    // If file doesn't exist, return empty array
    if !profiles_path.exists() {
        return Ok("[]".to_string());
    }

    fs::read_to_string(&profiles_path)
        .await
        .map_err(|e| format!("Failed to read profiles: {}", e))
}

/// Save a learner profile (upsert)
#[tauri::command]
pub async fn save_learner_profile(
    app_handle: tauri::AppHandle,
    profile: String,
) -> Result<(), String> {
    let learners_dir = get_learners_dir(&app_handle)?;
    let profiles_path = get_profiles_path(&app_handle)?;

    // Create directory if it doesn't exist
    fs::create_dir_all(&learners_dir)
        .await
        .map_err(|e| format!("Failed to create learners directory: {}", e))?;

    // Parse the incoming profile
    let new_profile: Value =
        serde_json::from_str(&profile).map_err(|e| format!("Invalid profile JSON: {}", e))?;

    let learner_id = new_profile
        .get("learnerId")
        .and_then(|v| v.as_str())
        .ok_or("Profile must have a learnerId")?;

    // Read existing profiles
    let mut profiles: Vec<Value> = if profiles_path.exists() {
        let content = fs::read_to_string(&profiles_path)
            .await
            .map_err(|e| format!("Failed to read profiles: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };

    // Find and update existing profile, or add new one
    let mut found = false;
    for profile in profiles.iter_mut() {
        if profile.get("learnerId").and_then(|v| v.as_str()) == Some(learner_id) {
            *profile = new_profile.clone();
            found = true;
            break;
        }
    }
    if !found {
        profiles.push(new_profile.clone());
    }

    // Write profiles back
    let content = serde_json::to_string_pretty(&profiles)
        .map_err(|e| format!("Failed to serialize profiles: {}", e))?;
    fs::write(&profiles_path, content)
        .await
        .map_err(|e| format!("Failed to write profiles: {}", e))?;

    // Create learner directory
    let learner_dir = get_learner_dir(&app_handle, learner_id)?;
    fs::create_dir_all(&learner_dir)
        .await
        .map_err(|e| format!("Failed to create learner directory: {}", e))?;

    Ok(())
}

/// Delete a learner profile and all associated data
#[tauri::command]
pub async fn delete_learner_profile(
    app_handle: tauri::AppHandle,
    learner_id: String,
) -> Result<(), String> {
    let profiles_path = get_profiles_path(&app_handle)?;
    let learner_dir = get_learner_dir(&app_handle, &learner_id)?;

    // Remove from profiles list
    if profiles_path.exists() {
        let content = fs::read_to_string(&profiles_path)
            .await
            .map_err(|e| format!("Failed to read profiles: {}", e))?;
        let mut profiles: Vec<Value> =
            serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());

        profiles.retain(|p| p.get("learnerId").and_then(|v| v.as_str()) != Some(&learner_id));

        let content = serde_json::to_string_pretty(&profiles)
            .map_err(|e| format!("Failed to serialize profiles: {}", e))?;
        fs::write(&profiles_path, content)
            .await
            .map_err(|e| format!("Failed to write profiles: {}", e))?;
    }

    // Delete learner directory and all contents
    if learner_dir.exists() {
        fs::remove_dir_all(&learner_dir)
            .await
            .map_err(|e| format!("Failed to delete learner data: {}", e))?;
    }

    Ok(())
}

// ============================================
// Mastery Commands
// ============================================

/// Get mastery data for a learner
#[tauri::command]
pub async fn get_learner_mastery(
    app_handle: tauri::AppHandle,
    learner_id: String,
) -> Result<String, String> {
    let learner_dir = get_learner_dir(&app_handle, &learner_id)?;
    let mastery_path = learner_dir.join(MASTERY_FILE);

    // If file doesn't exist, return default structure
    if !mastery_path.exists() {
        let default = serde_json::json!({
            "learnerId": learner_id,
            "objectives": {},
            "lastSessionDate": null
        });
        return Ok(default.to_string());
    }

    fs::read_to_string(&mastery_path)
        .await
        .map_err(|e| format!("Failed to read mastery data: {}", e))
}

/// Save mastery data for a specific objective
#[tauri::command]
pub async fn save_objective_mastery(
    app_handle: tauri::AppHandle,
    learner_id: String,
    objective_mastery: String,
) -> Result<(), String> {
    let learner_dir = get_learner_dir(&app_handle, &learner_id)?;
    let mastery_path = learner_dir.join(MASTERY_FILE);

    // Create directory if it doesn't exist
    fs::create_dir_all(&learner_dir)
        .await
        .map_err(|e| format!("Failed to create learner directory: {}", e))?;

    // Parse the incoming objective mastery
    let new_mastery: Value = serde_json::from_str(&objective_mastery)
        .map_err(|e| format!("Invalid mastery JSON: {}", e))?;

    let objective_id = new_mastery
        .get("objectiveId")
        .and_then(|v| v.as_str())
        .ok_or("Mastery must have an objectiveId")?;

    // Read existing mastery data or create default
    let mut mastery_data: Value = if mastery_path.exists() {
        let content = fs::read_to_string(&mastery_path)
            .await
            .map_err(|e| format!("Failed to read mastery data: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| {
            serde_json::json!({
                "learnerId": learner_id,
                "objectives": {},
                "lastSessionDate": null
            })
        })
    } else {
        serde_json::json!({
            "learnerId": learner_id,
            "objectives": {},
            "lastSessionDate": null
        })
    };

    // Update the objectives map
    if let Some(objectives) = mastery_data.get_mut("objectives") {
        if let Some(obj_map) = objectives.as_object_mut() {
            obj_map.insert(objective_id.to_string(), new_mastery);
        }
    }

    // Update last session date
    let now = chrono::Utc::now().to_rfc3339();
    if let Some(obj) = mastery_data.as_object_mut() {
        obj.insert("lastSessionDate".to_string(), Value::String(now));
    }

    // Write mastery data back
    let content = serde_json::to_string_pretty(&mastery_data)
        .map_err(|e| format!("Failed to serialize mastery data: {}", e))?;
    fs::write(&mastery_path, content)
        .await
        .map_err(|e| format!("Failed to write mastery data: {}", e))?;

    Ok(())
}

/// Save complete mastery data for a learner (bulk update)
#[tauri::command]
pub async fn save_learner_mastery(
    app_handle: tauri::AppHandle,
    learner_id: String,
    mastery_data: String,
) -> Result<(), String> {
    let learner_dir = get_learner_dir(&app_handle, &learner_id)?;
    let mastery_path = learner_dir.join(MASTERY_FILE);

    // Create directory if it doesn't exist
    fs::create_dir_all(&learner_dir)
        .await
        .map_err(|e| format!("Failed to create learner directory: {}", e))?;

    // Validate JSON
    let _: Value =
        serde_json::from_str(&mastery_data).map_err(|e| format!("Invalid mastery JSON: {}", e))?;

    // Write mastery data
    fs::write(&mastery_path, &mastery_data)
        .await
        .map_err(|e| format!("Failed to write mastery data: {}", e))?;

    Ok(())
}

// ============================================
// Quick Check Commands (Phase 2)
// ============================================

const QUICK_CHECKS_FILE: &str = "quick-checks.json";

/// Get quick check history for a learner
#[tauri::command]
pub async fn get_quick_check_history(
    app_handle: tauri::AppHandle,
    learner_id: String,
    objective_id: Option<String>,
) -> Result<String, String> {
    let learner_dir = get_learner_dir(&app_handle, &learner_id)?;
    let checks_path = learner_dir.join(QUICK_CHECKS_FILE);

    // If file doesn't exist, return empty array
    if !checks_path.exists() {
        return Ok("[]".to_string());
    }

    let content = fs::read_to_string(&checks_path)
        .await
        .map_err(|e| format!("Failed to read quick check history: {}", e))?;

    // Filter by objective_id if provided
    if let Some(obj_id) = objective_id {
        let checks: Vec<Value> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());
        let filtered: Vec<&Value> = checks
            .iter()
            .filter(|c| c.get("objectiveId").and_then(|v| v.as_str()) == Some(&obj_id))
            .collect();
        return serde_json::to_string(&filtered)
            .map_err(|e| format!("Failed to serialize filtered history: {}", e));
    }

    Ok(content)
}

/// Save a quick check result
#[tauri::command]
pub async fn save_quick_check_result(
    app_handle: tauri::AppHandle,
    learner_id: String,
    result: String,
) -> Result<(), String> {
    let learner_dir = get_learner_dir(&app_handle, &learner_id)?;
    let checks_path = learner_dir.join(QUICK_CHECKS_FILE);

    // Create directory if it doesn't exist
    fs::create_dir_all(&learner_dir)
        .await
        .map_err(|e| format!("Failed to create learner directory: {}", e))?;

    // Parse the incoming result
    let new_result: Value =
        serde_json::from_str(&result).map_err(|e| format!("Invalid result JSON: {}", e))?;

    // Read existing history
    let mut history: Vec<Value> = if checks_path.exists() {
        let content = fs::read_to_string(&checks_path)
            .await
            .map_err(|e| format!("Failed to read quick check history: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };

    // Add new result
    history.push(new_result);

    // Write history back
    let content = serde_json::to_string_pretty(&history)
        .map_err(|e| format!("Failed to serialize history: {}", e))?;
    fs::write(&checks_path, content)
        .await
        .map_err(|e| format!("Failed to write quick check history: {}", e))?;

    Ok(())
}
