use serde::Serialize;
use std::path::PathBuf;

use super::support::{CommandResult, PUBLIC_JSON_FILES};

#[derive(Debug, Serialize)]
pub struct ProjectRootStatus {
    pub root_path: String,
    pub valid: bool,
    pub public_json_count: usize,
    pub missing: Vec<String>,
}

#[tauri::command]
pub fn validate_project_root(project_root: String) -> CommandResult<ProjectRootStatus> {
    let root = PathBuf::from(&project_root);
    let required = [
        "apps/web",
        "apps/admin",
        "scripts/build-public.mjs",
        "apps/web/CNAME",
        ".git",
    ];

    let mut missing: Vec<String> = required
        .iter()
        .filter(|entry| !root.join(entry).exists())
        .map(|entry| entry.to_string())
        .collect();

    if !root.join("package.json").exists() && !root.join("docs/specification.md").exists() {
        missing.push("package.json or docs/specification.md".to_string());
    }

    let public_json_count = PUBLIC_JSON_FILES
        .iter()
        .filter(|(_, path)| root.join(path).exists())
        .count();

    CommandResult::ok(ProjectRootStatus {
        root_path: project_root,
        valid: missing.is_empty() && public_json_count == PUBLIC_JSON_FILES.len(),
        public_json_count,
        missing,
    })
}
