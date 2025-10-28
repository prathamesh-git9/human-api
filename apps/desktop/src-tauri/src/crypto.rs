use argon2::{Argon2, PasswordHash, PasswordHasher, PasswordVerifier};
use argon2::password_hash::{rand_core::OsRng, SaltString};
use aes_gcm::{Aes256Gcm, Key, Nonce};
use aes_gcm::aead::{Aead, NewAead, generic_array::GenericArray};
use anyhow::Result;
use rand::Rng;

pub struct CryptoManager {
    argon2: Argon2<'static>,
}

impl CryptoManager {
    pub fn new() -> Self {
        Self {
            argon2: Argon2::default(),
        }
    }

    pub fn hash_password(&self, password: &str) -> Result<String> {
        let salt = SaltString::generate(&mut OsRng);
        let password_hash = self.argon2.hash_password(password.as_bytes(), &salt)?;
        Ok(password_hash.to_string())
    }

    pub fn verify_password(&self, password: &str, hash: &str) -> Result<bool> {
        let parsed_hash = PasswordHash::new(hash)?;
        Ok(self.argon2.verify_password(password.as_bytes(), &parsed_hash).is_ok())
    }

    pub fn generate_key(&self) -> [u8; 32] {
        let mut key = [0u8; 32];
        OsRng.fill(&mut key);
        key
    }

    pub fn encrypt_data(&self, data: &[u8], key: &[u8; 32]) -> Result<Vec<u8>> {
        let cipher = Aes256Gcm::new(Key::from_slice(key));
        let nonce = self.generate_nonce();
        let ciphertext = cipher.encrypt(&nonce, data)?;
        
        // Prepend nonce to ciphertext
        let mut result = nonce.to_vec();
        result.extend_from_slice(&ciphertext);
        Ok(result)
    }

    pub fn decrypt_data(&self, encrypted_data: &[u8], key: &[u8; 32]) -> Result<Vec<u8>> {
        if encrypted_data.len() < 12 {
            return Err(anyhow::anyhow!("Encrypted data too short"));
        }

        let (nonce_bytes, ciphertext) = encrypted_data.split_at(12);
        let nonce = GenericArray::from_slice(nonce_bytes);
        let cipher = Aes256Gcm::new(Key::from_slice(key));
        
        let plaintext = cipher.decrypt(nonce, ciphertext)?;
        Ok(plaintext)
    }

    fn generate_nonce(&self) -> GenericArray<u8, aes_gcm::aead::consts::U12> {
        let mut nonce = [0u8; 12];
        OsRng.fill(&mut nonce);
        GenericArray::from_slice(&nonce).clone()
    }
}

impl Default for CryptoManager {
    fn default() -> Self {
        Self::new()
    }
}
