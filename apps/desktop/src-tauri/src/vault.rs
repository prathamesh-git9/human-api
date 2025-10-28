use crate::crypto::CryptoManager;
use crate::database::Database;
use crate::commands::{VaultConfig, VaultStatus};
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;
use sqlx::Row;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VaultData {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub encryption_enabled: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

pub struct VaultManager {
    crypto: CryptoManager,
    db: Option<Database>,
    current_vault: Option<VaultData>,
    is_unlocked: bool,
}

impl VaultManager {
    pub fn new() -> Self {
        Self {
            crypto: CryptoManager::new(),
            db: None,
            current_vault: None,
            is_unlocked: false,
        }
    }

    pub async fn create_vault(&mut self, config: VaultConfig, master_password: String) -> Result<VaultStatus> {
        // Initialize database
        let db = Database::new().await?;
        let pool = db.get_pool().await;

        // Create vault record
        let vault_id = Uuid::new_v4().to_string();
        let now = chrono::Utc::now();

        sqlx::query(
            "INSERT INTO vaults (id, name, description, encryption_enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .bind(&vault_id)
        .bind(&config.name)
        .bind(&config.description)
        .bind(config.encryption_enabled)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        // Hash master password
        let password_hash = self.crypto.hash_password(&master_password)?;

        // Store encrypted vault key (in a real implementation, this would be more secure)
        let vault_key = self.crypto.generate_key();
        let encrypted_key = self.crypto.encrypt_data(&vault_key, &self.crypto.generate_key())?;

        // Store vault metadata
        let vault_data = VaultData {
            id: vault_id,
            name: config.name.clone(),
            description: config.description,
            encryption_enabled: config.encryption_enabled,
            created_at: now,
            updated_at: now,
        };

        self.current_vault = Some(vault_data);
        self.is_unlocked = true;
        self.db = Some(db);

        Ok(VaultStatus {
            is_initialized: true,
            is_unlocked: true,
            name: Some(config.name),
            memory_count: 0,
            last_sync: Some(now.to_rfc3339()),
        })
    }

    pub async fn unlock_vault(&mut self, master_password: String) -> Result<VaultStatus> {
        // In a real implementation, you would verify the master password
        // and decrypt the vault key
        
        let db = Database::new().await?;
        let pool = db.get_pool().await;

        // Get vault data
        let row = sqlx::query("SELECT id, name, description, encryption_enabled, created_at, updated_at FROM vaults ORDER BY created_at DESC LIMIT 1")
            .fetch_optional(pool)
            .await?;

        if let Some(row) = row {
            let vault_data = VaultData {
                id: row.get("id"),
                name: row.get("name"),
                description: row.get("description"),
                encryption_enabled: row.get("encryption_enabled"),
                created_at: row.get("created_at"),
                updated_at: row.get("updated_at"),
            };

            // Count memories
            let memory_count: i64 = sqlx::query("SELECT COUNT(*) FROM memories WHERE vault_id = ?")
                .bind(&vault_data.id)
                .fetch_one(pool)
                .await?
                .get(0);

            self.current_vault = Some(vault_data.clone());
            self.is_unlocked = true;
            self.db = Some(db);

            Ok(VaultStatus {
                is_initialized: true,
                is_unlocked: true,
                name: Some(vault_data.name),
                memory_count: memory_count as u64,
                last_sync: Some(vault_data.updated_at.to_rfc3339()),
            })
        } else {
            Ok(VaultStatus {
                is_initialized: false,
                is_unlocked: false,
                name: None,
                memory_count: 0,
                last_sync: None,
            })
        }
    }

    pub async fn get_status(&self) -> Result<VaultStatus> {
        if let Some(vault) = &self.current_vault {
            let memory_count = if let Some(db) = &self.db {
                let pool = db.get_pool().await;
                let count: i64 = sqlx::query("SELECT COUNT(*) FROM memories WHERE vault_id = ?")
                    .bind(&vault.id)
                    .fetch_one(pool)
                    .await?
                    .get(0);
                count as u64
            } else {
                0
            };

            Ok(VaultStatus {
                is_initialized: true,
                is_unlocked: self.is_unlocked,
                name: Some(vault.name.clone()),
                memory_count,
                last_sync: Some(vault.updated_at.to_rfc3339()),
            })
        } else {
            Ok(VaultStatus {
                is_initialized: false,
                is_unlocked: false,
                name: None,
                memory_count: 0,
                last_sync: None,
            })
        }
    }

    pub async fn update_settings(&mut self, name: Option<String>, description: Option<String>) -> Result<()> {
        if let Some(vault) = &mut self.current_vault {
            if let Some(db) = &self.db {
                let pool = db.get_pool().await;
                let now = chrono::Utc::now();

                sqlx::query(
                    "UPDATE vaults SET name = COALESCE(?, name), description = COALESCE(?, description), updated_at = ? WHERE id = ?"
                )
                .bind(&name)
                .bind(&description)
                .bind(now)
                .bind(&vault.id)
                .execute(pool)
                .await?;

                if let Some(new_name) = name {
                    vault.name = new_name;
                }
                if let Some(new_description) = description {
                    vault.description = Some(new_description);
                }
                vault.updated_at = now;
            }
        }
        Ok(())
    }

    pub fn is_unlocked(&self) -> bool {
        self.is_unlocked
    }

    pub fn get_vault_id(&self) -> Option<&String> {
        self.current_vault.as_ref().map(|v| &v.id)
    }
}
