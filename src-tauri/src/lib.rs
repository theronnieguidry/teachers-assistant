mod commands;

use commands::{file_system, dialog, learner_storage, library_storage, design_pack_storage, project_storage};

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
            learner_storage::get_learner_profiles,
            learner_storage::save_learner_profile,
            learner_storage::delete_learner_profile,
            learner_storage::get_learner_mastery,
            learner_storage::save_objective_mastery,
            learner_storage::save_learner_mastery,
            learner_storage::get_quick_check_history,
            learner_storage::save_quick_check_result,
            // Library storage commands (Issue #20)
            library_storage::get_library_index,
            library_storage::save_library_index,
            library_storage::get_artifact,
            library_storage::save_artifact,
            library_storage::delete_artifact,
            library_storage::search_artifacts,
            // Design pack storage commands (Issue #20)
            design_pack_storage::get_design_packs,
            design_pack_storage::get_design_pack,
            design_pack_storage::save_design_pack,
            design_pack_storage::delete_design_pack,
            // Local project storage commands (Issue #20)
            project_storage::get_local_projects,
            project_storage::get_local_project,
            project_storage::save_local_project,
            project_storage::delete_local_project,
            project_storage::get_projects_by_type,
            project_storage::add_artifact_to_project,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
