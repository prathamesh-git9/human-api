use sqlx::{sqlite::SqlitePool, Row};
use anyhow::Result;
use std::path::PathBuf;
use dirs::data_dir;

pub struct Database {
    pool: SqlitePool,
}

impl Database {
    pub async fn new() -> Result<Self> {
        // Try to get data directory, fallback to current directory if not available
        let data_dir = data_dir()
            .map(|dir| dir.join("human-api"))
            .unwrap_or_else(|| std::env::current_dir().unwrap_or_else(|_| std::path::PathBuf::from(".")).join("data"));
        
        std::fs::create_dir_all(&data_dir)
            .map_err(|e| anyhow::anyhow!("Failed to create data directory {}: {}", data_dir.display(), e))?;
        
        let db_path = data_dir.join("memories.db");
        let database_url = format!("sqlite://{}", db_path.display());
        
        println!("Initializing database at: {}", database_url);
        
        let pool = SqlitePool::connect(&database_url)
            .await
            .map_err(|e| anyhow::anyhow!("Failed to connect to database at {}: {}", database_url, e))?;
        
        let db = Database { pool };
        db.init_schema().await?;
        
        Ok(db)
    }

    async fn init_schema(&self) -> Result<()> {
        // Create vaults table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS vaults (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                encryption_enabled BOOLEAN NOT NULL DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create memories table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS memories (
                id TEXT PRIMARY KEY,
                vault_id TEXT NOT NULL,
                title TEXT,
                content TEXT NOT NULL,
                source TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (vault_id) REFERENCES vaults (id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create chunks table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS chunks (
                id TEXT PRIMARY KEY,
                memory_id TEXT NOT NULL,
                content TEXT NOT NULL,
                start_pos INTEGER NOT NULL,
                end_pos INTEGER NOT NULL,
                embedding BLOB,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (memory_id) REFERENCES memories (id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create tags table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS tags (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                color TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create memory_tags junction table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS memory_tags (
                memory_id TEXT NOT NULL,
                tag_id TEXT NOT NULL,
                PRIMARY KEY (memory_id, tag_id),
                FOREIGN KEY (memory_id) REFERENCES memories (id),
                FOREIGN KEY (tag_id) REFERENCES tags (id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create citations table
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS citations (
                id TEXT PRIMARY KEY,
                memory_id TEXT NOT NULL,
                chunk_id TEXT NOT NULL,
                relevance_score REAL NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (memory_id) REFERENCES memories (id),
                FOREIGN KEY (chunk_id) REFERENCES chunks (id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create embeddings table for vector search
        sqlx::query(
            r#"
            CREATE TABLE IF NOT EXISTS embeddings (
                id TEXT PRIMARY KEY,
                chunk_id TEXT NOT NULL,
                vector BLOB NOT NULL,
                model_name TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (chunk_id) REFERENCES chunks (id)
            )
            "#,
        )
        .execute(&self.pool)
        .await?;

        // Create indexes for better performance
        sqlx::query("CREATE INDEX IF NOT EXISTS idx_memories_vault_id ON memories (vault_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_chunks_memory_id ON chunks (memory_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_memory_tags_memory_id ON memory_tags (memory_id)")
            .execute(&self.pool)
            .await?;

        sqlx::query("CREATE INDEX IF NOT EXISTS idx_citations_memory_id ON citations (memory_id)")
            .execute(&self.pool)
            .await?;

        Ok(())
    }

    pub async fn get_pool(&self) -> &SqlitePool {
        &self.pool
    }
}

pub async fn init() -> Result<()> {
    let _db = Database::new().await?;
    Ok(())
}
