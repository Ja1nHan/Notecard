use std::path::PathBuf;

fn config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("NoteCard")
        .join("config.json")
}

#[tauri::command]
pub fn load_config() -> Result<String, String> {
    let path = config_path();
    if path.exists() {
        std::fs::read_to_string(&path).map_err(|e| e.to_string())
    } else {
        Ok("{}".to_string())
    }
}

#[tauri::command]
pub fn save_config(config: String) -> Result<(), String> {
    const MAX_CONFIG_SIZE: usize = 1_000_000;
    if config.len() > MAX_CONFIG_SIZE {
        return Err("Config exceeds maximum allowed size".to_string());
    }
    serde_json::from_str::<serde_json::Value>(&config)
        .map_err(|e| format!("Invalid JSON config: {e}"))?;
    let path = config_path();
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    std::fs::write(&path, config).map_err(|e| e.to_string())
}
