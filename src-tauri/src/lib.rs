mod commands;

use commands::{file_system, dialog};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            file_system::save_file,
            file_system::read_file,
            dialog::open_folder,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
