use serde_json::Value;
use std::path::PathBuf;
use tokio::fs;

const PROJECTS_DIR: &str = "projects";
const INDEX_FILE: &str = "projects.json";

// Helper to get the projects directory
fn get_projects_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    Ok(app_data_dir.join(PROJECTS_DIR))
}

// Helper to get the index file path
fn get_index_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(get_projects_dir(app_handle)?.join(INDEX_FILE))
}

// ============================================
// Local Project Commands
// ============================================

/// Get all local projects
#[tauri::command]
pub async fn get_local_projects(app_handle: tauri::AppHandle) -> Result<String, String> {
    let index_path = get_index_path(&app_handle)?;

    // If file doesn't exist, return empty array
    if !index_path.exists() {
        return Ok("[]".to_string());
    }

    fs::read_to_string(&index_path)
        .await
        .map_err(|e| format!("Failed to read projects: {}", e))
}

/// Get a specific project by ID
#[tauri::command]
pub async fn get_local_project(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<String, String> {
    let index_path = get_index_path(&app_handle)?;

    if !index_path.exists() {
        return Err(format!("Project not found: {}", project_id));
    }

    let content = fs::read_to_string(&index_path)
        .await
        .map_err(|e| format!("Failed to read projects: {}", e))?;

    let projects: Vec<Value> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());

    for project in projects {
        if project.get("projectId").and_then(|v| v.as_str()) == Some(&project_id) {
            return serde_json::to_string(&project)
                .map_err(|e| format!("Failed to serialize project: {}", e));
        }
    }

    Err(format!("Project not found: {}", project_id))
}

/// Save a local project (create or update)
#[tauri::command]
pub async fn save_local_project(
    app_handle: tauri::AppHandle,
    project: String,
) -> Result<(), String> {
    let projects_dir = get_projects_dir(&app_handle)?;
    let index_path = get_index_path(&app_handle)?;

    // Create directory if it doesn't exist
    fs::create_dir_all(&projects_dir)
        .await
        .map_err(|e| format!("Failed to create projects directory: {}", e))?;

    // Parse the incoming project
    let new_project: Value =
        serde_json::from_str(&project).map_err(|e| format!("Invalid project JSON: {}", e))?;

    let project_id = new_project
        .get("projectId")
        .and_then(|v| v.as_str())
        .ok_or("Project must have a projectId")?;

    // Read existing projects
    let mut projects: Vec<Value> = if index_path.exists() {
        let content = fs::read_to_string(&index_path)
            .await
            .map_err(|e| format!("Failed to read projects: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };

    // Find and update existing project, or add new one
    let mut found = false;
    for project in projects.iter_mut() {
        if project.get("projectId").and_then(|v| v.as_str()) == Some(project_id) {
            *project = new_project.clone();
            found = true;
            break;
        }
    }
    if !found {
        projects.push(new_project);
    }

    // Write projects back
    let content = serde_json::to_string_pretty(&projects)
        .map_err(|e| format!("Failed to serialize projects: {}", e))?;
    fs::write(&index_path, content)
        .await
        .map_err(|e| format!("Failed to write projects: {}", e))?;

    Ok(())
}

/// Delete a local project
#[tauri::command]
pub async fn delete_local_project(
    app_handle: tauri::AppHandle,
    project_id: String,
) -> Result<(), String> {
    let index_path = get_index_path(&app_handle)?;

    if !index_path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(&index_path)
        .await
        .map_err(|e| format!("Failed to read projects: {}", e))?;

    let mut projects: Vec<Value> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());

    // Remove the project
    projects.retain(|p| p.get("projectId").and_then(|v| v.as_str()) != Some(&project_id));

    // Write projects back
    let content = serde_json::to_string_pretty(&projects)
        .map_err(|e| format!("Failed to serialize projects: {}", e))?;
    fs::write(&index_path, content)
        .await
        .map_err(|e| format!("Failed to write projects: {}", e))?;

    Ok(())
}

/// Get projects by type (learning_path or quick_create)
#[tauri::command]
pub async fn get_projects_by_type(
    app_handle: tauri::AppHandle,
    project_type: String,
) -> Result<String, String> {
    let index_path = get_index_path(&app_handle)?;

    if !index_path.exists() {
        return Ok("[]".to_string());
    }

    let content = fs::read_to_string(&index_path)
        .await
        .map_err(|e| format!("Failed to read projects: {}", e))?;

    let projects: Vec<Value> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());

    let filtered: Vec<&Value> = projects
        .iter()
        .filter(|p| p.get("type").and_then(|v| v.as_str()) == Some(&project_type))
        .collect();

    serde_json::to_string(&filtered).map_err(|e| format!("Failed to serialize projects: {}", e))
}

/// Add artifact ID to project's artifact list
#[tauri::command]
pub async fn add_artifact_to_project(
    app_handle: tauri::AppHandle,
    project_id: String,
    artifact_id: String,
) -> Result<(), String> {
    let index_path = get_index_path(&app_handle)?;

    if !index_path.exists() {
        return Err(format!("Project not found: {}", project_id));
    }

    let content = fs::read_to_string(&index_path)
        .await
        .map_err(|e| format!("Failed to read projects: {}", e))?;

    let mut projects: Vec<Value> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());

    let mut found = false;
    for project in projects.iter_mut() {
        if project.get("projectId").and_then(|v| v.as_str()) == Some(&project_id) {
            // Get or create artifactIds array
            if let Some(obj) = project.as_object_mut() {
                let artifact_ids = obj
                    .entry("artifactIds")
                    .or_insert_with(|| Value::Array(Vec::new()));
                if let Some(arr) = artifact_ids.as_array_mut() {
                    // Only add if not already present
                    let artifact_value = Value::String(artifact_id.clone());
                    if !arr.contains(&artifact_value) {
                        arr.push(artifact_value);
                    }
                }

                // Update lastActivityDate
                obj.insert(
                    "lastActivityDate".to_string(),
                    Value::String(chrono::Utc::now().to_rfc3339()),
                );
                obj.insert(
                    "updatedAt".to_string(),
                    Value::String(chrono::Utc::now().to_rfc3339()),
                );
            }
            found = true;
            break;
        }
    }

    if !found {
        return Err(format!("Project not found: {}", project_id));
    }

    // Write projects back
    let content = serde_json::to_string_pretty(&projects)
        .map_err(|e| format!("Failed to serialize projects: {}", e))?;
    fs::write(&index_path, content)
        .await
        .map_err(|e| format!("Failed to write projects: {}", e))?;

    Ok(())
}
