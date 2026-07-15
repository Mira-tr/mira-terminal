use serde::Serialize;

use super::support::{read_json, resolve_inside_root, CommandResult, PUBLIC_JSON_FILES};

#[derive(Debug, Serialize)]
pub struct PublicJsonSummary {
    pub module_id: String,
    pub path: String,
    pub top_level_keys: Vec<String>,
}

#[tauri::command]
pub fn read_public_json(project_root: String) -> CommandResult<Vec<PublicJsonSummary>> {
    let mut summaries = Vec::new();

    for (module_id, relative_path) in PUBLIC_JSON_FILES {
        let (_, target) = match resolve_inside_root(&project_root, relative_path) {
            Ok(paths) => paths,
            Err(error) => return CommandResult::err(error),
        };
        let value = match read_json(&target) {
            Ok(value) => value,
            Err(error) => return CommandResult::err(format!("{relative_path}: {error}")),
        };
        let top_level_keys = value
            .as_object()
            .map(|object| object.keys().cloned().collect())
            .unwrap_or_default();
        summaries.push(PublicJsonSummary {
            module_id: module_id.to_string(),
            path: relative_path.to_string(),
            top_level_keys,
        });
    }

    CommandResult::ok(summaries)
}
