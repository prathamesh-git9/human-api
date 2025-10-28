use crate::database::Database;
use crate::commands::{MemoryEntry, QueryRequest, QueryResult, Citation, MemoryStats, SystemInfo};
use anyhow::Result;
use uuid::Uuid;
use chrono::Utc;
use std::collections::HashMap;

pub struct MemoryManager {
    db: Option<Database>,
}

impl MemoryManager {
    pub fn new() -> Self {
        Self { db: None }
    }

    async fn get_db(&mut self) -> Result<&Database> {
        if self.db.is_none() {
            self.db = Some(Database::new().await?);
        }
        Ok(self.db.as_ref().unwrap())
    }

    pub async fn add_memory(&mut self, mut entry: MemoryEntry) -> Result<String> {
        let db = self.get_db().await?;
        let pool = db.get_pool().await;
        
        let memory_id = entry.id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let now = Utc::now();

        // Insert memory
        sqlx::query(
            "INSERT INTO memories (id, vault_id, title, content, source, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
        )
        .bind(&memory_id)
        .bind("default") // For now, use a default vault
        .bind(&entry.title)
        .bind(&entry.content)
        .bind(&entry.source)
        .bind(now)
        .bind(now)
        .execute(pool)
        .await?;

        // Add tags
        for tag_name in &entry.tags {
            let tag_id = self.ensure_tag(&pool, tag_name).await?;
            sqlx::query(
                "INSERT OR IGNORE INTO memory_tags (memory_id, tag_id) VALUES (?, ?)"
            )
            .bind(&memory_id)
            .bind(&tag_id)
            .execute(&pool)
            .await?;
        }

        // Create chunks (simplified - in real implementation, use the chunker from core)
        let chunks = self.create_chunks(&entry.content)?;
        for (i, chunk) in chunks.iter().enumerate() {
            let chunk_id = Uuid::new_v4().to_string();
            sqlx::query(
                "INSERT INTO chunks (id, memory_id, content, start_pos, end_pos, created_at) VALUES (?, ?, ?, ?, ?, ?)"
            )
            .bind(&chunk_id)
            .bind(&memory_id)
            .bind(chunk)
            .bind(i * 100) // Simplified position calculation
            .bind((i + 1) * 100)
            .bind(now)
            .execute(&pool)
            .await?;
        }

        Ok(memory_id)
    }

    async fn ensure_tag(&self, pool: &sqlx::SqlitePool, tag_name: &str) -> Result<String> {
        // Check if tag exists
        let existing = sqlx::query("SELECT id FROM tags WHERE name = ?")
            .bind(tag_name)
            .fetch_optional(pool)
            .await?;

        if let Some(row) = existing {
            Ok(row.get("id"))
        } else {
            // Create new tag
            let tag_id = Uuid::new_v4().to_string();
            sqlx::query("INSERT INTO tags (id, name, created_at) VALUES (?, ?, ?)")
                .bind(&tag_id)
                .bind(tag_name)
                .bind(Utc::now())
                .execute(&pool)
                .await?;
            Ok(tag_id)
        }
    }

    fn create_chunks(&self, content: &str) -> Result<Vec<String>> {
        // Simplified chunking - in real implementation, use the core chunker
        let words: Vec<&str> = content.split_whitespace().collect();
        let chunk_size = 50; // words per chunk
        let mut chunks = Vec::new();
        
        for chunk in words.chunks(chunk_size) {
            chunks.push(chunk.join(" "));
        }
        
        Ok(chunks)
    }

    pub async fn query_memory(&mut self, request: QueryRequest) -> Result<QueryResult> {
        let db = self.get_db().await?;
        let pool = db.get_pool().await;
        
        // Simplified query - in real implementation, use vector search
        let limit = request.limit.unwrap_or(10);
        
        let rows = sqlx::query(
            "SELECT m.id, m.title, m.content, m.source, c.content as chunk_content 
             FROM memories m 
             JOIN chunks c ON m.id = c.memory_id 
             WHERE m.content LIKE ? OR c.content LIKE ?
             ORDER BY m.updated_at DESC 
             LIMIT ?"
        )
        .bind(&format!("%{}%", request.query))
        .bind(&format!("%{}%", request.query))
        .bind(limit as i64)
        .fetch_all(&pool)
        .await?;

        let mut citations = Vec::new();
        let mut answer_parts = Vec::new();

        for row in rows {
            let memory_id: String = row.get("id");
            let title: Option<String> = row.get("title");
            let content: String = row.get("content");
            let source: Option<String> = row.get("source");
            let chunk_content: String = row.get("chunk_content");

            answer_parts.push(chunk_content.clone());

            if request.include_citations {
                citations.push(Citation {
                    id: memory_id.clone(),
                    title,
                    content: chunk_content,
                    relevance_score: 0.8, // Simplified scoring
                    source,
                });
            }
        }

        let answer = answer_parts.join("\n\n");
        let confidence = if citations.is_empty() { 0.0 } else { 0.8 };

        Ok(QueryResult {
            answer,
            citations,
            confidence,
            processing_time_ms: 100, // Simplified timing
        })
    }

    pub async fn search_memories(
        &mut self,
        query: String,
        limit: Option<usize>,
        tags: Option<Vec<String>>,
    ) -> Result<Vec<MemoryEntry>> {
        let db = self.get_db().await?;
        let pool = db.get_pool().await;
        let limit = limit.unwrap_or(20) as i64;

        let mut memories = Vec::new();

        if let Some(tag_names) = tags {
            // Search by tags
            let placeholders = tag_names.iter().map(|_| "?").collect::<Vec<_>>().join(",");
            let query_sql = format!(
                "SELECT DISTINCT m.id, m.title, m.content, m.source, m.created_at, m.updated_at
                 FROM memories m
                 JOIN memory_tags mt ON m.id = mt.memory_id
                 JOIN tags t ON mt.tag_id = t.id
                 WHERE t.name IN ({})
                 ORDER BY m.updated_at DESC
                 LIMIT ?",
                placeholders
            );

            let mut query_builder = sqlx::query(&query_sql);
            for tag_name in &tag_names {
                query_builder = query_builder.bind(tag_name);
            }
            query_builder = query_builder.bind(limit);

            let rows = query_builder.fetch_all(pool).await?;

            for row in rows {
                let memory_id: String = row.get("id");
                let tags = self.get_memory_tags(pool, &memory_id).await?;
                
                memories.push(MemoryEntry {
                    id: Some(memory_id),
                    title: row.get("title"),
                    content: row.get("content"),
                    source: row.get("source"),
                    tags,
                    created_at: Some(row.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339()),
                    updated_at: Some(row.get::<chrono::DateTime<Utc>, _>("updated_at").to_rfc3339()),
                });
            }
        } else {
            // Search by content
            let rows = sqlx::query(
                "SELECT id, title, content, source, created_at, updated_at
                 FROM memories
                 WHERE content LIKE ?
                 ORDER BY updated_at DESC
                 LIMIT ?"
            )
            .bind(&format!("%{}%", query))
            .bind(limit)
            .fetch_all(&pool)
            .await?;

            for row in rows {
                let memory_id: String = row.get("id");
                let tags = self.get_memory_tags(pool, &memory_id).await?;
                
                memories.push(MemoryEntry {
                    id: Some(memory_id),
                    title: row.get("title"),
                    content: row.get("content"),
                    source: row.get("source"),
                    tags,
                    created_at: Some(row.get::<chrono::DateTime<Utc>, _>("created_at").to_rfc3339()),
                    updated_at: Some(row.get::<chrono::DateTime<Utc>, _>("updated_at").to_rfc3339()),
                });
            }
        }

        Ok(memories)
    }

    async fn get_memory_tags(&self, pool: &sqlx::SqlitePool, memory_id: &str) -> Result<Vec<String>> {
        let rows = sqlx::query(
            "SELECT t.name FROM tags t
             JOIN memory_tags mt ON t.id = mt.tag_id
             WHERE mt.memory_id = ?"
        )
        .bind(memory_id)
        .fetch_all(&pool)
        .await?;

        Ok(rows.into_iter().map(|row| row.get("name")).collect())
    }

    pub async fn get_stats(&mut self) -> Result<MemoryStats> {
        let db = self.get_db().await?;
        let pool = db.get_pool().await;

        let memory_count: i64 = sqlx::query("SELECT COUNT(*) FROM memories")
            .fetch_one(pool)
            .await?
            .get(0);

        let chunk_count: i64 = sqlx::query("SELECT COUNT(*) FROM chunks")
            .fetch_one(pool)
            .await?
            .get(0);

        let embedding_count: i64 = sqlx::query("SELECT COUNT(*) FROM embeddings")
            .fetch_one(pool)
            .await?
            .get(0);

        // Simplified storage calculation
        let storage_size = (memory_count * 1000 + chunk_count * 500) as u64;

        Ok(MemoryStats {
            total_memories: memory_count as u64,
            total_chunks: chunk_count as u64,
            total_embeddings: embedding_count as u64,
            storage_size_bytes: storage_size,
            last_updated: Utc::now().to_rfc3339(),
        })
    }

    pub async fn delete_memory(&mut self, id: String) -> Result<()> {
        let db = self.get_db().await?;
        let pool = db.get_pool().await;

        // Delete associated chunks and citations first
        sqlx::query("DELETE FROM citations WHERE memory_id = ?")
            .bind(&id)
            .execute(&pool)
            .await?;

        sqlx::query("DELETE FROM chunks WHERE memory_id = ?")
            .bind(&id)
            .execute(&pool)
            .await?;

        sqlx::query("DELETE FROM memory_tags WHERE memory_id = ?")
            .bind(&id)
            .execute(&pool)
            .await?;

        // Delete memory
        sqlx::query("DELETE FROM memories WHERE id = ?")
            .bind(&id)
            .execute(&pool)
            .await?;

        Ok(())
    }

    pub async fn update_memory(&mut self, id: String, mut entry: MemoryEntry) -> Result<()> {
        let db = self.get_db().await?;
        let pool = db.get_pool().await;
        let now = Utc::now();

        // Update memory
        sqlx::query(
            "UPDATE memories SET title = ?, content = ?, source = ?, updated_at = ? WHERE id = ?"
        )
        .bind(&entry.title)
        .bind(&entry.content)
        .bind(&entry.source)
        .bind(now)
        .bind(&id)
        .execute(pool)
        .await?;

        // Update tags
        sqlx::query("DELETE FROM memory_tags WHERE memory_id = ?")
            .bind(&id)
            .execute(&pool)
            .await?;

        for tag_name in &entry.tags {
            let tag_id = self.ensure_tag(&pool, tag_name).await?;
            sqlx::query("INSERT INTO memory_tags (memory_id, tag_id) VALUES (?, ?)")
                .bind(&id)
                .bind(&tag_id)
                .execute(&pool)
                .await?;
        }

        Ok(())
    }

    pub async fn get_citations(&mut self, memory_id: String) -> Result<Vec<Citation>> {
        let db = self.get_db().await?;
        let pool = db.get_pool().await;

        let rows = sqlx::query(
            "SELECT c.id, m.title, c.content, c.relevance_score, m.source
             FROM citations c
             JOIN chunks ch ON c.chunk_id = ch.id
             JOIN memories m ON c.memory_id = m.id
             WHERE c.memory_id = ?
             ORDER BY c.relevance_score DESC"
        )
        .bind(&memory_id)
        .fetch_all(&pool)
        .await?;

        let mut citations = Vec::new();
        for row in rows {
            citations.push(Citation {
                id: row.get("id"),
                title: row.get("title"),
                content: row.get("content"),
                relevance_score: row.get("relevance_score"),
                source: row.get("source"),
            });
        }

        Ok(citations)
    }

    pub async fn get_insights(&mut self, period: String) -> Result<serde_json::Value> {
        // Simplified insights - in real implementation, generate meaningful insights
        let insights = serde_json::json!({
            "period": period,
            "total_memories": 0,
            "new_memories": 0,
            "top_tags": [],
            "memory_trends": [],
            "generated_at": Utc::now().to_rfc3339()
        });

        Ok(insights)
    }

    pub async fn export_data(&mut self, format: String) -> Result<String> {
        // Simplified export - in real implementation, export actual data
        let export_data = serde_json::json!({
            "format": format,
            "exported_at": Utc::now().to_rfc3339(),
            "data": []
        });

        Ok(export_data.to_string())
    }

    pub async fn import_data(&mut self, data: String, _format: String) -> Result<()> {
        // Simplified import - in real implementation, parse and import data
        let _parsed: serde_json::Value = serde_json::from_str(&data)?;
        Ok(())
    }

    pub async fn sync_embeddings(&mut self) -> Result<()> {
        // Simplified sync - in real implementation, generate embeddings for new chunks
        Ok(())
    }

    pub async fn get_system_info(&mut self) -> Result<SystemInfo> {
        Ok(SystemInfo {
            version: env!("CARGO_PKG_VERSION").to_string(),
            platform: std::env::consts::OS.to_string(),
            arch: std::env::consts::ARCH.to_string(),
            memory_usage: 0, // Simplified
            disk_usage: 0,   // Simplified
        })
    }
}
