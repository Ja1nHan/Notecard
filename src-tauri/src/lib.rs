mod commands;
mod crypto;
mod state;

use tauri::{Emitter, Manager};

#[cfg(target_os = "windows")]
mod win_shell {
    extern "system" {
        pub fn SHChangeNotify(
            wEventId: i32,
            uFlags: u32,
            dwItem1: *const (),
            dwItem2: *const (),
        );
    }
}

#[cfg(target_os = "windows")]
fn ensure_file_association() {
    use winreg::enums::*;
    use winreg::RegKey;

    let exe_path = match std::env::current_exe() {
        Ok(p) => p.to_string_lossy().to_string(),
        Err(_) => return,
    };

    let icon_value = format!("\"{}\",0", exe_path);
    let open_cmd = format!("\"{}\" \"%1\"", exe_path);

    let hkcu = RegKey::predef(HKEY_CURRENT_USER);

    // 只有当 DefaultIcon 与当前 exe 路径完全一致时才跳过
    let already_correct = hkcu
        .open_subkey("Software\\Classes\\NoteCard.Document\\DefaultIcon")
        .and_then(|k| k.get_value::<String, _>(""))
        .map(|v| v == icon_value)
        .unwrap_or(false);

    if already_correct {
        return;
    }

    // 注册 ProgID、图标、打开命令
    if let Ok((prog, _)) = hkcu.create_subkey("Software\\Classes\\NoteCard.Document") {
        let _ = prog.set_value("", &"NoteCard 文件");
        if let Ok((icon, _)) = prog.create_subkey("DefaultIcon") {
            let _ = icon.set_value("", &icon_value);
        }
        if let Ok((cmd, _)) = prog.create_subkey("shell\\open\\command") {
            let _ = cmd.set_value("", &open_cmd);
        }
    }

    // 注册 .ncard 扩展名
    if let Ok((ext, _)) = hkcu.create_subkey("Software\\Classes\\.ncard") {
        let _ = ext.set_value("", &"NoteCard.Document");
        let _ = ext.set_value("Content Type", &"application/x-notecard");
    }

    // 通知 Explorer 刷新图标缓存（SHCNE_ASSOCCHANGED | SHCNF_IDLIST）
    unsafe {
        win_shell::SHChangeNotify(0x08000000, 0x0000, std::ptr::null(), std::ptr::null());
    }
}

#[cfg(not(target_os = "windows"))]
fn ensure_file_association() {}

use commands::{
    change_file_password, decrypt_content, encrypt_content, get_startup_file, load_config,
    lock_session, save_config, session_status, setup_file_password, unlock_session,
};

/// 检测是否以绿色版（便携模式）运行：exe 文件名包含 "portable" 即为便携模式
#[tauri::command]
fn is_portable() -> bool {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.file_name().map(|n| n.to_string_lossy().to_lowercase().contains("portable")))
        .unwrap_or(false)
}

/// 用系统默认浏览器打开 URL（绿色版更新跳转用）
#[tauri::command]
fn open_url(url: String) {
    // Windows: cmd /c start "" <url>  空字符串是 start 命令的"窗口标题"占位
    let _ = std::process::Command::new("cmd")
        .args(["/c", "start", "", &url])
        .spawn();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    std::thread::spawn(ensure_file_association);

    let startup_file: Option<String> = std::env::args()
        .skip(1)
        .find(|a| a.ends_with(".ncard"));

    let app_state = state::AppState::default();
    if let Some(ref path) = startup_file {
        *app_state.startup_file.lock().unwrap() = Some(path.clone());
    }

    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
            if let Some(path) = argv.iter().skip(1).find(|a| a.ends_with(".ncard")) {
                let _ = app.emit("open-file", path);
            }
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .manage(app_state)
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            setup_file_password,
            change_file_password,
            unlock_session,
            lock_session,
            session_status,
            encrypt_content,
            decrypt_content,
            get_startup_file,
            is_portable,
            open_url,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
