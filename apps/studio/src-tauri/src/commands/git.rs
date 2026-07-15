use serde::Serialize;
use std::process::Command;

use super::support::CommandResult;

#[derive(Debug, Serialize)]
pub struct GitStatus {
    pub branch: String,
    pub head_sha: String,
    pub porcelain: String,
    pub dirty: bool,
}

#[tauri::command]
pub fn read_git_status(project_root: String) -> CommandResult<GitStatus> {
    let branch = run_git(&project_root, ["branch", "--show-current"].as_slice());
    let head_sha = run_git(&project_root, ["rev-parse", "HEAD"].as_slice());
    let porcelain = run_git(&project_root, ["status", "--short"].as_slice());

    match (branch, head_sha, porcelain) {
        (Ok(branch), Ok(head_sha), Ok(porcelain)) => CommandResult::ok(GitStatus {
            branch,
            head_sha,
            dirty: !porcelain.trim().is_empty(),
            porcelain,
        }),
        (_, _, Err(error)) | (_, Err(error), _) | (Err(error), _, _) => CommandResult::err(error),
    }
}

fn run_git(project_root: &str, args: &[&str]) -> Result<String, String> {
    let output = Command::new("git")
        .args(args)
        .current_dir(project_root)
        .output()
        .map_err(|error| format!("Git is not available: {error}"))?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
}
