use serde_json::Value;
use std::path::PathBuf;
use tokio::fs;

const INSPIRATION_DIR: &str = "inspiration";
const ITEMS_FILE: &str = "items.json";

fn get_inspiration_dir(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data directory: {}", e))?;
    Ok(app_data_dir.join(INSPIRATION_DIR))
}

fn get_items_path(app_handle: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(get_inspiration_dir(app_handle)?.join(ITEMS_FILE))
}

async fn read_items(app_handle: &tauri::AppHandle) -> Result<Vec<Value>, String> {
    let items_path = get_items_path(app_handle)?;
    if !items_path.exists() {
        return Ok(Vec::new());
    }

    let content = fs::read_to_string(&items_path)
        .await
        .map_err(|e| format!("Failed to read inspiration items: {}", e))?;

    Ok(serde_json::from_str(&content).unwrap_or_else(|_| Vec::new()))
}

async fn write_items(app_handle: &tauri::AppHandle, items: &[Value]) -> Result<(), String> {
    let inspiration_dir = get_inspiration_dir(app_handle)?;
    let items_path = get_items_path(app_handle)?;

    fs::create_dir_all(&inspiration_dir)
        .await
        .map_err(|e| format!("Failed to create inspiration directory: {}", e))?;

    let content = serde_json::to_string_pretty(items)
        .map_err(|e| format!("Failed to serialize inspiration items: {}", e))?;

    fs::write(&items_path, content)
        .await
        .map_err(|e| format!("Failed to write inspiration items: {}", e))?;

    Ok(())
}

fn create_merge_key(item: &Value) -> String {
    [
        item.get("type").and_then(|v| v.as_str()).unwrap_or(""),
        item.get("sourceUrl").and_then(|v| v.as_str()).unwrap_or(""),
        item.get("title").and_then(|v| v.as_str()).unwrap_or(""),
        item.get("content").and_then(|v| v.as_str()).unwrap_or(""),
        item.get("storagePath").and_then(|v| v.as_str()).unwrap_or(""),
    ]
    .join("|")
}

#[tauri::command]
pub async fn get_inspiration_items(app_handle: tauri::AppHandle) -> Result<String, String> {
    let items = read_items(&app_handle).await?;
    serde_json::to_string(&items).map_err(|e| format!("Failed to serialize inspiration items: {}", e))
}

#[tauri::command]
pub async fn get_inspiration_item(
    app_handle: tauri::AppHandle,
    item_id: String,
) -> Result<String, String> {
    let items = read_items(&app_handle).await?;
    for item in items {
        if item.get("id").and_then(|v| v.as_str()) == Some(&item_id) {
            return serde_json::to_string(&item)
                .map_err(|e| format!("Failed to serialize inspiration item: {}", e));
        }
    }

    Err(format!("Inspiration item not found: {}", item_id))
}

#[tauri::command]
pub async fn save_inspiration_item(
    app_handle: tauri::AppHandle,
    item: String,
) -> Result<(), String> {
    let new_item: Value =
        serde_json::from_str(&item).map_err(|e| format!("Invalid inspiration item JSON: {}", e))?;
    let item_id = new_item
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or("Inspiration item must have an id")?;

    let mut items = read_items(&app_handle).await?;
    let mut found = false;

    for existing in items.iter_mut() {
        if existing.get("id").and_then(|v| v.as_str()) == Some(item_id) {
            *existing = new_item.clone();
            found = true;
            break;
        }
    }

    if !found {
        items.insert(0, new_item);
    }

    write_items(&app_handle, &items).await
}

#[tauri::command]
pub async fn delete_inspiration_item(
    app_handle: tauri::AppHandle,
    item_id: String,
) -> Result<(), String> {
    let mut items = read_items(&app_handle).await?;
    items.retain(|item| item.get("id").and_then(|v| v.as_str()) != Some(&item_id));
    write_items(&app_handle, &items).await
}

#[tauri::command]
pub async fn bulk_upsert_inspiration_items(
    app_handle: tauri::AppHandle,
    items: String,
) -> Result<String, String> {
    let incoming: Vec<Value> =
        serde_json::from_str(&items).map_err(|e| format!("Invalid inspiration items JSON: {}", e))?;
    let mut existing = read_items(&app_handle).await?;
    let mut resolved: Vec<Value> = Vec::new();

    for item in incoming {
        let item_id = item
            .get("id")
            .and_then(|v| v.as_str())
            .ok_or("Inspiration item must have an id")?
            .to_string();
        let item_key = create_merge_key(&item);

        if let Some(found) = existing.iter().find(|existing_item| {
            existing_item.get("id").and_then(|v| v.as_str()) == Some(item_id.as_str())
                || create_merge_key(existing_item) == item_key
        }) {
            resolved.push(found.clone());
            continue;
        }

        existing.insert(0, item.clone());
        resolved.push(item);
    }

    write_items(&app_handle, &existing).await?;

    serde_json::to_string(&resolved)
        .map_err(|e| format!("Failed to serialize resolved inspiration items: {}", e))
}
