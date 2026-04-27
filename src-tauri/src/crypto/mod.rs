use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm, Key, Nonce,
};
use argon2::{Algorithm, Argon2, Params, Version};
use base64::{engine::general_purpose::STANDARD, Engine as _};
use rand::RngCore;
use thiserror::Error;

const VERIFY_MAGIC: &[u8] = b"NOTECARD_VERIFY_1";

#[derive(Debug, Error)]
pub enum CryptoError {
    #[error("key derivation failed")]
    Argon2,
    #[error("encryption error")]
    Encrypt,
    #[error("密码错误或数据已损坏")]
    Decrypt,
    #[error("invalid base64: {0}")]
    Base64(#[from] base64::DecodeError),
}

fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; 32], CryptoError> {
    let params = Params::new(65536, 3, 2, Some(32)).map_err(|_| CryptoError::Argon2)?;
    let argon2 = Argon2::new(Algorithm::Argon2id, Version::V0x13, params);
    let mut key = [0u8; 32];
    argon2
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|_| CryptoError::Argon2)?;
    Ok(key)
}

fn aes_enc(key: &[u8; 32], plaintext: &[u8]) -> Result<([u8; 12], Vec<u8>), CryptoError> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce_gen = Aes256Gcm::generate_nonce(&mut OsRng);
    let ct = cipher
        .encrypt(&nonce_gen, plaintext)
        .map_err(|_| CryptoError::Encrypt)?;
    let mut nonce = [0u8; 12];
    nonce.copy_from_slice(&nonce_gen);
    Ok((nonce, ct))
}

fn aes_dec(key: &[u8; 32], nonce_bytes: &[u8], ct: &[u8]) -> Result<Vec<u8>, CryptoError> {
    let cipher = Aes256Gcm::new(Key::<Aes256Gcm>::from_slice(key));
    let nonce = Nonce::from_slice(nonce_bytes);
    cipher.decrypt(nonce, ct).map_err(|_| CryptoError::Decrypt)
}

fn b64(bytes: &[u8]) -> String {
    STANDARD.encode(bytes)
}



/// Create a new FileLock AND return the derived session key in one pass.
/// Caller must zeroize the returned key after storing it.
pub fn make_session_lock(password: &str) -> Result<([u8; 32], String, String, String), CryptoError> {
    let mut salt = [0u8; 32];
    OsRng.fill_bytes(&mut salt);
    let key = derive_key(password, &salt)?;
    let (nonce, ct) = aes_enc(&key, VERIFY_MAGIC)?;
    Ok((key, b64(&salt), b64(&nonce), b64(&ct)))
}

/// Verify password against a FileLock; return derived session key if correct, None if wrong.
pub fn unlock_with_password(
    password: &str,
    salt_b64: &str,
    verify_nonce_b64: &str,
    verify_cipher_b64: &str,
) -> Result<Option<[u8; 32]>, CryptoError> {
    let salt = STANDARD.decode(salt_b64)?;
    let nonce = STANDARD.decode(verify_nonce_b64)?;
    let ct = STANDARD.decode(verify_cipher_b64)?;
    let key = derive_key(password, &salt)?;
    match aes_dec(&key, &nonce, &ct) {
        Ok(plain) if plain == VERIFY_MAGIC => Ok(Some(key)),
        Ok(_) => Ok(None),
        Err(CryptoError::Decrypt) => Ok(None),
        Err(e) => Err(e),
    }
}

/// Encrypt plaintext with a pre-derived key (no Argon2 — uses in-memory session key).
pub fn encrypt_with_key(key: &[u8; 32], plaintext: &[u8]) -> Result<(String, String), CryptoError> {
    let (nonce, ct) = aes_enc(key, plaintext)?;
    Ok((b64(&nonce), b64(&ct)))
}

/// Decrypt ciphertext with a pre-derived key.
pub fn decrypt_with_key(key: &[u8; 32], nonce_b64: &str, cipher_b64: &str) -> Result<Vec<u8>, CryptoError> {
    let nonce = STANDARD.decode(nonce_b64)?;
    let ct = STANDARD.decode(cipher_b64)?;
    aes_dec(key, &nonce, &ct)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_lock_round_trip() {
        let (key, salt, nonce, cipher) = make_session_lock("test_password").unwrap();
        let result = unlock_with_password("test_password", &salt, &nonce, &cipher).unwrap();
        assert!(result.is_some());
        assert_eq!(result.unwrap(), key);
    }

    #[test]
    fn wrong_password_returns_none() {
        let (_key, salt, nonce, cipher) = make_session_lock("correct").unwrap();
        let result = unlock_with_password("wrong", &salt, &nonce, &cipher).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn encrypt_decrypt_with_key_round_trip() {
        let (key, _, _, _) = make_session_lock("pwd").unwrap();
        let plaintext = b"hello secret world";
        let (nonce, cipher) = encrypt_with_key(&key, plaintext).unwrap();
        let decrypted = decrypt_with_key(&key, &nonce, &cipher).unwrap();
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn decrypt_with_wrong_key_fails() {
        let (key, _, _, _) = make_session_lock("pwd1").unwrap();
        let (wrong_key, _, _, _) = make_session_lock("pwd2").unwrap();
        let (nonce, cipher) = encrypt_with_key(&key, b"secret").unwrap();
        let result = decrypt_with_key(&wrong_key, &nonce, &cipher);
        assert!(result.is_err());
    }
}

