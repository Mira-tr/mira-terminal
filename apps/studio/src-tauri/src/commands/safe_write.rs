use serde::Serialize;
use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use super::support::{resolve_inside_root, sha256_text, CommandResult};

const PUBLIC_NOTES_PATH: &str = "apps/web/notes/data/public-notes.json";

#[derive(Debug, Serialize)]
pub struct SafeWriteResult {
    pub target: String,
    pub backup: String,
    pub before_sha256: String,
    pub after_sha256: String,
}

#[tauri::command]
pub fn safe_write_public_notes_poc(project_root: String, next_json: String) -> CommandResult<SafeWriteResult> {
    let (root, target) = match resolve_inside_root(&project_root, PUBLIC_NOTES_PATH) {
        Ok(paths) => paths,
        Err(error) => return CommandResult::err(error),
    };

    if let Ok(metadata) = fs::symlink_metadata(&target) {
        if metadata.file_type().is_symlink() {
            return CommandResult::err("Refusing to write through a symbolic link.");
        }
    }

    let original = match fs::read_to_string(&target) {
        Ok(text) => text,
        Err(error) => return CommandResult::err(format!("Failed to read target: {error}")),
    };

    if let Err(error) = serde_json::from_str::<serde_json::Value>(&original) {
        return CommandResult::err(format!("Target JSON is broken: {error}"));
    }

    let parsed = match serde_json::from_str::<serde_json::Value>(&next_json) {
        Ok(value) => value,
        Err(error) => return CommandResult::err(format!("Next JSON is broken: {error}")),
    };

    if parsed.get("exportType").and_then(|value| value.as_str()) != Some("public-notes") {
        return CommandResult::err("exportType must be public-notes.");
    }

    if !parsed.get("notes").map(|value| value.is_array()).unwrap_or(false) {
        return CommandResult::err("notes must be an array.");
    }

    let backup_dir = root.join("backup/studio/phase0");
    let backup_file = backup_dir.join(PUBLIC_NOTES_PATH);
    let temp_file = target.with_extension("json.tmp");

    if let Err(error) = fs::create_dir_all(backup_file.parent().unwrap_or(Path::new("."))) {
        return CommandResult::err(format!("Failed to create backup directory: {error}"));
    }

    if let Err(error) = fs::copy(&target, &backup_file) {
        return CommandResult::err(format!("Failed to create backup: {error}"));
    }

    let manifest_file = backup_dir.join("manifest.json");
    let manifest = serde_json::json!({
        "schemaVersion": 1,
        "appVersion": "0.6.0-phase0",
        "createdAt": unix_timestamp(),
        "operation": "studio-safe-write-public-notes-poc",
        "result": "prepared",
        "files": [
            {
                "target": PUBLIC_NOTES_PATH,
                "backup": backup_file.to_string_lossy(),
                "beforeSha256": sha256_text(&original),
                "afterSha256": sha256_text(&next_json)
            }
        ]
    });

    if let Err(error) = fs::write(&temp_file, format!("{}\n", next_json.trim_end())) {
        let _ = fs::remove_file(&temp_file);
        return CommandResult::err(format!("Failed to write temp file: {error}"));
    }

    if let Err(error) = fs::rename(&temp_file, &target) {
        let _ = fs::remove_file(&temp_file);
        return CommandResult::err(format!("Failed to replace target: {error}"));
    }

    let readback = match fs::read_to_string(&target) {
        Ok(text) => text,
        Err(error) => {
            let _ = fs::copy(&backup_file, &target);
            return CommandResult::err(format!("Readback failed and rollback was attempted: {error}"));
        }
    };

    if let Err(error) = fs::write(&manifest_file, format!("{}\n", manifest)) {
        return CommandResult::err(format!("Target was replaced but backup manifest could not be written: {error}"));
    }

    CommandResult::ok(SafeWriteResult {
        target: PUBLIC_NOTES_PATH.to_string(),
        backup: backup_file.to_string_lossy().to_string(),
        before_sha256: sha256_text(&original),
        after_sha256: sha256_text(&readback),
    })
}

fn unix_timestamp() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs())
        .unwrap_or(0)
}
