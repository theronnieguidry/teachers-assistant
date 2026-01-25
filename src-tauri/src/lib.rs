mod commands;

use commands::{file_system, dialog, ollama};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .invoke_handler(tauri::generate_handler![
            file_system::save_file,
            file_system::read_file,
            dialog::open_folder,
            ollama::check_ollama_status,
            ollama::install_ollama,
            ollama::start_ollama,
            ollama::stop_ollama,
            ollama::pull_ollama_model,
            ollama::list_ollama_models,
            ollama::get_recommended_models,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
