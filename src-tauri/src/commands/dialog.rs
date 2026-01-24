use tauri_plugin_shell::ShellExt;

#[tauri::command]
pub async fn open_folder(app: tauri::AppHandle, path: String) -> Result<(), String> {
    app.shell()
        .open(&path, None)
        .map_err(|e| e.to_string())
}
