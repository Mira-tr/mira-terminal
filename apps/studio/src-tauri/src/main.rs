mod commands;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            commands::project::validate_project_root,
            commands::public_json::read_public_json,
            commands::safe_write::safe_write_public_notes_poc,
            commands::build::run_public_build,
            commands::git::read_git_status
        ])
        .run(tauri::generate_context!())
        .expect("failed to run RELMUA Studio");
}
