use std::sync::Mutex;
use zeroize::Zeroize;

pub struct AppState {
    pub session_key: Mutex<Option<SessionKey>>,
    pub startup_file: Mutex<Option<String>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            session_key: Mutex::new(None),
            startup_file: Mutex::new(None),
        }
    }
}

pub struct SessionKey(pub [u8; 32]);

impl Drop for SessionKey {
    fn drop(&mut self) {
        self.0.zeroize();
    }
}
