use serde::{Deserialize, Serialize};
use tauri::State;

use crate::crypto::{
    decrypt_with_key, encrypt_with_key, make_session_lock, unlock_with_password,
};
use crate::state::{AppState, SessionKey};

// ── DTO types (mirror TypeScript interfaces) ─────────────────────────────────

#[derive(Debug, Serialize, Deserialize)]
pub struct FileLockDto {
    pub hint: String,
    pub salt: String,
    #[serde(rename = "verifyNonce")]
    pub verify_nonce: String,
    #[serde(rename = "verifyCipher")]
    pub verify_cipher: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct LockedContentDto {
    pub nonce: String,
    pub cipher: String,
}

// ── Commands ─────────────────────────────────────────────────────────────────

/// 初次设置文件密码，同时解锁本次 session。
#[tauri::command]
pub fn setup_file_password(
    password: String,
    hint: String,
    state: State<'_, AppState>,
) -> Result<FileLockDto, String> {
    let (key, salt, verify_nonce, verify_cipher) =
        make_session_lock(&password).map_err(|e| e.to_string())?;
    *state.session_key.lock().unwrap() = Some(SessionKey(key));
    Ok(FileLockDto { hint, salt, verify_nonce, verify_cipher })
}

/// 修改文件密码（需 session 已解锁），同时用新密码替换 session key。
/// 前端负责在调用前解密所有加锁内容、调用后重新加密。
#[tauri::command]
pub fn change_file_password(
    new_password: String,
    hint: String,
    state: State<'_, AppState>,
) -> Result<FileLockDto, String> {
    if state.session_key.lock().unwrap().is_none() {
        return Err("请先解锁文件才能修改密码".into());
    }
    let (key, salt, verify_nonce, verify_cipher) =
        make_session_lock(&new_password).map_err(|e| e.to_string())?;
    *state.session_key.lock().unwrap() = Some(SessionKey(key));
    Ok(FileLockDto { hint, salt, verify_nonce, verify_cipher })
}

/// 验证密码并解锁 session（将派生密钥存入 AppState）。
/// 返回 true = 密码正确，false = 密码错误。
#[tauri::command]
pub fn unlock_session(
    password: String,
    file_lock: FileLockDto,
    state: State<'_, AppState>,
) -> Result<bool, String> {
    let result = unlock_with_password(
        &password,
        &file_lock.salt,
        &file_lock.verify_nonce,
        &file_lock.verify_cipher,
    )
    .map_err(|e| e.to_string())?;

    match result {
        Some(key) => {
            *state.session_key.lock().unwrap() = Some(SessionKey(key));
            Ok(true)
        }
        None => Ok(false),
    }
}

/// 锁定 session（清除内存中的 session key）。
#[tauri::command]
pub fn lock_session(state: State<'_, AppState>) {
    *state.session_key.lock().unwrap() = None;
}

/// 返回当前 session 是否已解锁。
#[tauri::command]
pub fn session_status(state: State<'_, AppState>) -> bool {
    state.session_key.lock().unwrap().is_some()
}

/// 用 session key 加密明文（session 必须已解锁）。
#[tauri::command]
pub fn encrypt_content(
    plaintext: String,
    state: State<'_, AppState>,
) -> Result<LockedContentDto, String> {
    let guard = state.session_key.lock().unwrap();
    let key = guard.as_ref().ok_or("未解锁，无法加密内容")?;
    let (nonce, cipher) =
        encrypt_with_key(&key.0, plaintext.as_bytes()).map_err(|e| e.to_string())?;
    Ok(LockedContentDto { nonce, cipher })
}

/// 用 session key 解密密文（session 必须已解锁）。
#[tauri::command]
pub fn decrypt_content(
    locked: LockedContentDto,
    state: State<'_, AppState>,
) -> Result<String, String> {
    let guard = state.session_key.lock().unwrap();
    let key = guard.as_ref().ok_or("未解锁，无法解密内容")?;
    let bytes =
        decrypt_with_key(&key.0, &locked.nonce, &locked.cipher).map_err(|e| e.to_string())?;
    String::from_utf8(bytes).map_err(|e| e.to_string())
}
