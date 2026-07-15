use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Path, PathBuf};

pub const PUBLIC_JSON_FILES: [(&str, &str); 8] = [
    ("brand-home", "apps/web/data/public-home.json"),
    ("projects", "apps/web/game/data/public-games.json"),
    ("tools", "apps/web/tools/data/public-tools.json"),
    ("notes", "apps/web/notes/data/public-notes.json"),
    ("creators", "apps/web/data/public-creators.json"),
    ("profile", "apps/web/data/public-profile.json"),
    ("trpg", "apps/web/data/creators/chikage/trpg/public-scenarios.json"),
    ("house-rules", "apps/web/data/creators/chikage/trpg/house-rules.json"),
];

#[derive(Debug, Serialize)]
pub struct CommandResult<T: Serialize> {
    pub ok: bool,
    pub data: Option<T>,
    pub errors: Vec<String>,
}

impl<T: Serialize> CommandResult<T> {
    pub fn ok(data: T) -> Self {
        Self {
            ok: true,
            data: Some(data),
            errors: vec![],
        }
    }

    pub fn err(error: impl Into<String>) -> Self {
        Self {
            ok: false,
            data: None,
            errors: vec![error.into()],
        }
    }
}

pub fn resolve_inside_root(project_root: &str, relative_path: &str) -> Result<(PathBuf, PathBuf), String> {
    let root = PathBuf::from(project_root)
        .canonicalize()
        .map_err(|error| format!("Project root is not accessible: {error}"))?;
    let target = root.join(relative_path);
    let normalized_parent = target
        .parent()
        .ok_or_else(|| "Target has no parent directory.".to_string())?
        .canonicalize()
        .map_err(|error| format!("Target parent is not accessible: {error}"))?;

    if !normalized_parent.starts_with(&root) {
        return Err("Target path escapes the project root.".to_string());
    }

    Ok((root, target))
}

pub fn read_json(path: &Path) -> Result<serde_json::Value, String> {
    let text = fs::read_to_string(path)
        .map_err(|error| format!("Failed to read JSON: {error}"))?;
    serde_json::from_str(&text)
        .map_err(|error| format!("Failed to parse JSON: {error}"))
}

pub fn sha256_text(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    format!("{:x}", hasher.finalize())
}
