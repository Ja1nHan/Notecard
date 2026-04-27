mod config;
mod crypto;

pub use config::{load_config, save_config};
pub use crypto::{
    change_file_password, decrypt_content, encrypt_content, lock_session, session_status,
    setup_file_password, unlock_session,
};

#[tauri::command]
pub fn get_startup_file(state: tauri::State<crate::state::AppState>) -> Option<String> {
    state.startup_file.lock().unwrap().take()
}
