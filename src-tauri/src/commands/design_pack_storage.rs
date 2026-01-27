use serde_json::Value;
use std::path::PathBuf;
use tokio::fs;

const DESIGN_PACKS_DIR: &str = "design-packs";
const INDEX_FILE: &str = "packs.json";

// Helper to get the design packs directory
fn get_packs_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    Ok(app_data_dir.join(DESIGN_PACKS_DIR))
}

// Helper to get the index file path
fn get_index_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(get_packs_dir(app_handle)?.join(INDEX_FILE))
}

// ============================================
// Design Pack Commands
// ============================================

/// Get all design packs
#[tauri::command]
pub async fn get_design_packs(app_handle: tauri::AppHandle) -> Result<String, String> {
    let index_path = get_index_path(&app_handle)?;

    // If file doesn't exist, return empty array
    if !index_path.exists() {
        return Ok("[]".to_string());
    }

    fs::read_to_string(&index_path)
        .await
        .map_err(|e| format!("Failed to read design packs: {}", e))
}

/// Get a specific design pack by ID
#[tauri::command]
pub async fn get_design_pack(
    app_handle: tauri::AppHandle,
    pack_id: String,
) -> Result<String, String> {
    let index_path = get_index_path(&app_handle)?;

    if !index_path.exists() {
        return Err(format!("Design pack not found: {}", pack_id));
    }

    let content = fs::read_to_string(&index_path)
        .await
        .map_err(|e| format!("Failed to read design packs: {}", e))?;

    let packs: Vec<Value> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());

    for pack in packs {
        if pack.get("packId").and_then(|v| v.as_str()) == Some(&pack_id) {
            return serde_json::to_string(&pack)
                .map_err(|e| format!("Failed to serialize pack: {}", e));
        }
    }

    Err(format!("Design pack not found: {}", pack_id))
}

/// Save a design pack (create or update)
#[tauri::command]
pub async fn save_design_pack(
    app_handle: tauri::AppHandle,
    pack: String,
) -> Result<(), String> {
    let packs_dir = get_packs_dir(&app_handle)?;
    let index_path = get_index_path(&app_handle)?;

    // Create directory if it doesn't exist
    fs::create_dir_all(&packs_dir)
        .await
        .map_err(|e| format!("Failed to create design packs directory: {}", e))?;

    // Parse the incoming pack
    let new_pack: Value =
        serde_json::from_str(&pack).map_err(|e| format!("Invalid pack JSON: {}", e))?;

    let pack_id = new_pack
        .get("packId")
        .and_then(|v| v.as_str())
        .ok_or("Pack must have a packId")?;

    // Read existing packs
    let mut packs: Vec<Value> = if index_path.exists() {
        let content = fs::read_to_string(&index_path)
            .await
            .map_err(|e| format!("Failed to read design packs: {}", e))?;
        serde_json::from_str(&content).unwrap_or_else(|_| Vec::new())
    } else {
        Vec::new()
    };

    // Find and update existing pack, or add new one
    let mut found = false;
    for pack in packs.iter_mut() {
        if pack.get("packId").and_then(|v| v.as_str()) == Some(pack_id) {
            *pack = new_pack.clone();
            found = true;
            break;
        }
    }
    if !found {
        packs.push(new_pack);
    }

    // Write packs back
    let content = serde_json::to_string_pretty(&packs)
        .map_err(|e| format!("Failed to serialize design packs: {}", e))?;
    fs::write(&index_path, content)
        .await
        .map_err(|e| format!("Failed to write design packs: {}", e))?;

    Ok(())
}

/// Delete a design pack
#[tauri::command]
pub async fn delete_design_pack(
    app_handle: tauri::AppHandle,
    pack_id: String,
) -> Result<(), String> {
    let index_path = get_index_path(&app_handle)?;

    if !index_path.exists() {
        return Ok(());
    }

    let content = fs::read_to_string(&index_path)
        .await
        .map_err(|e| format!("Failed to read design packs: {}", e))?;

    let mut packs: Vec<Value> = serde_json::from_str(&content).unwrap_or_else(|_| Vec::new());

    // Remove the pack
    packs.retain(|p| p.get("packId").and_then(|v| v.as_str()) != Some(&pack_id));

    // Write packs back
    let content = serde_json::to_string_pretty(&packs)
        .map_err(|e| format!("Failed to serialize design packs: {}", e))?;
    fs::write(&index_path, content)
        .await
        .map_err(|e| format!("Failed to write design packs: {}", e))?;

    Ok(())
}
