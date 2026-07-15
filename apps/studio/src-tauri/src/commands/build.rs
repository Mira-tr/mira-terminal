use serde::Serialize;
use std::process::Command;

use super::support::{read_json, CommandResult};

#[derive(Debug, Serialize)]
pub struct BuildResult {
    pub exit_code: i32,
    pub stdout: String,
    pub stderr: String,
    pub manifest_loaded: bool,
    pub admin_included: bool,
    pub cname: String,
}

#[tauri::command]
pub fn run_public_build(project_root: String) -> CommandResult<BuildResult> {
    let output = match Command::new("node")
        .arg("scripts/build-public.mjs")
        .current_dir(&project_root)
        .output()
    {
        Ok(output) => output,
        Err(error) => return CommandResult::err(format!("Build command failed to start: {error}")),
    };

    let manifest_path = std::path::Path::new(&project_root).join("dist/build-manifest.json");
    let manifest = read_json(&manifest_path).ok();
    let admin_included = manifest
        .as_ref()
        .and_then(|value| value.get("adminIncluded"))
        .and_then(|value| value.as_bool())
        .unwrap_or(true);
    let cname = manifest
        .as_ref()
        .and_then(|value| value.get("cname"))
        .and_then(|value| value.as_str())
        .unwrap_or("")
        .to_string();

    CommandResult::ok(BuildResult {
        exit_code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
        manifest_loaded: manifest.is_some(),
        admin_included,
        cname,
    })
}
