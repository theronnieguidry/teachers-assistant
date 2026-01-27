use serde_json::Value;
use std::path::PathBuf;
use tokio::fs;

const LIBRARY_DIR: &str = "library";
const INDEX_FILE: &str = "index.json";
const ARTIFACTS_DIR: &str = "artifacts";

// Helper to get the library directory
fn get_library_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    Ok(app_data_dir.join(LIBRARY_DIR))
}

// Helper to get the index file path
fn get_index_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(get_library_dir(app_handle)?.join(INDEX_FILE))
}

// Helper to get the artifacts directory
fn get_artifacts_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(get_library_dir(app_handle)?.join(ARTIFACTS_DIR))
}

// ============================================
// Library Index Commands
// ============================================

/// Get the library index (list of all artifacts)
#[tauri::command]
pub async fn get_library_index(app_handle: tauri::AppHandle) -> Result<String, String> {
    let index_path = get_index_path(&app_handle)?;

    // If file doesn't exist, return default structure
    if !index_path.exists() {
        let default = serde_json::json!({
            "version": 1,
            "lastUpdated": chrono::Utc::now().to_rfc3339(),
            "artifacts": []
        });
        return Ok(default.to_string());
    }

    fs::read_to_string(&index_path)
        .await
        .map_err(|e| format!("Failed to read library index: {}", e))
}

/// Save the library index
#[tauri::command]
pub async fn save_library_index(
    app_handle: tauri::AppHandle,
    index: String,
) -> Result<(), String> {
    let library_dir = get_library_dir(&app_handle)?;
    let index_path = get_index_path(&app_handle)?;

    // Create directory if it doesn't exist
    fs::create_dir_all(&library_dir)
        .await
        .map_err(|e| format!("Failed to create library directory: {}", e))?;

    // Validate JSON
    let _: Value =
        serde_json::from_str(&index).map_err(|e| format!("Invalid index JSON: {}", e))?;

    // Write index
    fs::write(&index_path, &index)
        .await
        .map_err(|e| format!("Failed to write library index: {}", e))?;

    Ok(())
}

// ============================================
// Artifact Commands
// ============================================

/// Get a specific artifact by ID
#[tauri::command]
pub async fn get_artifact(
    app_handle: tauri::AppHandle,
    artifact_id: String,
) -> Result<String, String> {
    let artifacts_dir = get_artifacts_dir(&app_handle)?;
    let artifact_path = artifacts_dir.join(format!("{}.json", artifact_id));

    if !artifact_path.exists() {
        return Err(format!("Artifact not found: {}", artifact_id));
    }

    fs::read_to_string(&artifact_path)
        .await
        .map_err(|e| format!("Failed to read artifact: {}", e))
}

/// Save an artifact (create or update)
#[tauri::command]
pub async fn save_artifact(
    app_handle: tauri::AppHandle,
    artifact: String,
) -> Result<(), String> {
    let library_dir = get_library_dir(&app_handle)?;
    let artifacts_dir = get_artifacts_dir(&app_handle)?;
    let index_path = get_index_path(&app_handle)?;

    // Create directories if they don't exist
    fs::create_dir_all(&artifacts_dir)
        .await
        .map_err(|e| format!("Failed to create artifacts directory: {}", e))?;

    // Parse the incoming artifact
    let artifact_value: Value =
        serde_json::from_str(&artifact).map_err(|e| format!("Invalid artifact JSON: {}", e))?;

    let artifact_id = artifact_value
        .get("artifactId")
        .and_then(|v| v.as_str())
        .ok_or("Artifact must have an artifactId")?;

    // Save the full artifact to its own file
    let artifact_path = artifacts_dir.join(format!("{}.json", artifact_id));
    fs::write(&artifact_path, &artifact)
        .await
        .map_err(|e| format!("Failed to write artifact: {}", e))?;

    // Update the index
    let mut index: Value = if index_path.exists() {
        let content = fs::read_to_string(&index_path)
            .await
            .map_err(|e| format!("Failed to read library index: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| {
            serde_json::json!({
                "version": 1,
                "lastUpdated": chrono::Utc::now().to_rfc3339(),
                "artifacts": []
            })
        })
    } else {
        serde_json::json!({
            "version": 1,
            "lastUpdated": chrono::Utc::now().to_rfc3339(),
            "artifacts": []
        })
    };

    // Create index entry (metadata only, no HTML content)
    let index_entry = serde_json::json!({
        "artifactId": artifact_value.get("artifactId"),
        "projectId": artifact_value.get("projectId"),
        "jobId": artifact_value.get("jobId"),
        "type": artifact_value.get("type"),
        "title": artifact_value.get("title"),
        "grade": artifact_value.get("grade"),
        "subject": artifact_value.get("subject"),
        "objectiveTags": artifact_value.get("objectiveTags"),
        "designPackId": artifact_value.get("designPackId"),
        "createdAt": artifact_value.get("createdAt"),
    });

    // Update artifacts array in index
    if let Some(artifacts) = index.get_mut("artifacts") {
        if let Some(arr) = artifacts.as_array_mut() {
            // Remove existing entry with same ID
            arr.retain(|a| a.get("artifactId").and_then(|v| v.as_str()) != Some(artifact_id));
            // Add new entry
            arr.push(index_entry);
        }
    }

    // Update lastUpdated
    if let Some(obj) = index.as_object_mut() {
        obj.insert(
            "lastUpdated".to_string(),
            Value::String(chrono::Utc::now().to_rfc3339()),
        );
    }

    // Write index
    let index_content = serde_json::to_string_pretty(&index)
        .map_err(|e| format!("Failed to serialize index: {}", e))?;
    fs::write(&index_path, index_content)
        .await
        .map_err(|e| format!("Failed to write library index: {}", e))?;

    Ok(())
}

/// Delete an artifact
#[tauri::command]
pub async fn delete_artifact(
    app_handle: tauri::AppHandle,
    artifact_id: String,
) -> Result<(), String> {
    let artifacts_dir = get_artifacts_dir(&app_handle)?;
    let index_path = get_index_path(&app_handle)?;
    let artifact_path = artifacts_dir.join(format!("{}.json", artifact_id));

    // Delete artifact file if it exists
    if artifact_path.exists() {
        fs::remove_file(&artifact_path)
            .await
            .map_err(|e| format!("Failed to delete artifact file: {}", e))?;
    }

    // Update index
    if index_path.exists() {
        let content = fs::read_to_string(&index_path)
            .await
            .map_err(|e| format!("Failed to read library index: {}", e))?;
        let mut index: Value = serde_json::from_str(&content).unwrap_or_else(|_| {
            serde_json::json!({
                "version": 1,
                "lastUpdated": chrono::Utc::now().to_rfc3339(),
                "artifacts": []
            })
        });

        if let Some(artifacts) = index.get_mut("artifacts") {
            if let Some(arr) = artifacts.as_array_mut() {
                arr.retain(|a| a.get("artifactId").and_then(|v| v.as_str()) != Some(&artifact_id));
            }
        }

        if let Some(obj) = index.as_object_mut() {
            obj.insert(
                "lastUpdated".to_string(),
                Value::String(chrono::Utc::now().to_rfc3339()),
            );
        }

        let index_content = serde_json::to_string_pretty(&index)
            .map_err(|e| format!("Failed to serialize index: {}", e))?;
        fs::write(&index_path, index_content)
            .await
            .map_err(|e| format!("Failed to write library index: {}", e))?;
    }

    Ok(())
}

/// Search artifacts with filters
#[tauri::command]
pub async fn search_artifacts(
    app_handle: tauri::AppHandle,
    query: String,
) -> Result<String, String> {
    let index_path = get_index_path(&app_handle)?;

    if !index_path.exists() {
        return Ok("[]".to_string());
    }

    // Parse query
    let query_value: Value =
        serde_json::from_str(&query).map_err(|e| format!("Invalid query JSON: {}", e))?;

    // Read index
    let content = fs::read_to_string(&index_path)
        .await
        .map_err(|e| format!("Failed to read library index: {}", e))?;
    let index: Value = serde_json::from_str(&content).unwrap_or_else(|_| {
        serde_json::json!({
            "version": 1,
            "lastUpdated": chrono::Utc::now().to_rfc3339(),
            "artifacts": []
        })
    });

    let artifacts = index.get("artifacts").and_then(|v| v.as_array());
    if artifacts.is_none() {
        return Ok("[]".to_string());
    }
    let artifacts = artifacts.unwrap();

    // Apply filters
    let filtered: Vec<&Value> = artifacts
        .iter()
        .filter(|artifact| {
            // Project ID filter
            if let Some(project_id) = query_value.get("projectId").and_then(|v| v.as_str()) {
                if artifact.get("projectId").and_then(|v| v.as_str()) != Some(project_id) {
                    return false;
                }
            }

            // Grade filter
            if let Some(grade) = query_value.get("grade").and_then(|v| v.as_str()) {
                if artifact.get("grade").and_then(|v| v.as_str()) != Some(grade) {
                    return false;
                }
            }

            // Subject filter
            if let Some(subject) = query_value.get("subject").and_then(|v| v.as_str()) {
                if artifact.get("subject").and_then(|v| v.as_str()) != Some(subject) {
                    return false;
                }
            }

            // Type filter
            if let Some(artifact_type) = query_value.get("type").and_then(|v| v.as_str()) {
                if artifact.get("type").and_then(|v| v.as_str()) != Some(artifact_type) {
                    return false;
                }
            }

            // Objective tag filter
            if let Some(objective_tag) = query_value.get("objectiveTag").and_then(|v| v.as_str()) {
                if let Some(tags) = artifact.get("objectiveTags").and_then(|v| v.as_array()) {
                    let has_tag = tags.iter().any(|t| t.as_str() == Some(objective_tag));
                    if !has_tag {
                        return false;
                    }
                } else {
                    return false;
                }
            }

            // Design pack ID filter
            if let Some(pack_id) = query_value.get("designPackId").and_then(|v| v.as_str()) {
                if artifact.get("designPackId").and_then(|v| v.as_str()) != Some(pack_id) {
                    return false;
                }
            }

            // Search text filter (title)
            if let Some(search_text) = query_value.get("searchText").and_then(|v| v.as_str()) {
                let search_lower = search_text.to_lowercase();
                if let Some(title) = artifact.get("title").and_then(|v| v.as_str()) {
                    if !title.to_lowercase().contains(&search_lower) {
                        return false;
                    }
                } else {
                    return false;
                }
            }

            true
        })
        .collect();

    serde_json::to_string(&filtered).map_err(|e| format!("Failed to serialize results: {}", e))
}
