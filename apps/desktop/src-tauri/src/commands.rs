use serde::{Deserialize, Serialize};
use tauri::State;
use crate::vault::VaultManager;
use crate::memory::MemoryManager;
use crate::database::Database;

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultConfig {
    pub name: String,
    pub description: Option<String>,
    pub encryption_enabled: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MemoryEntry {
    pub id: Option<String>,
    pub content: String,
    pub title: Option<String>,
    pub tags: Vec<String>,
    pub source: Option<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryRequest {
    pub query: String,
    pub limit: Option<usize>,
    pub include_citations: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResult {
    pub answer: String,
    pub citations: Vec<Citation>,
    pub confidence: f32,
    pub processing_time_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Citation {
    pub id: String,
    pub title: Option<String>,
    pub content: String,
    pub relevance_score: f32,
    pub source: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct VaultStatus {
    pub is_initialized: bool,
    pub is_unlocked: bool,
    pub name: Option<String>,
    pub memory_count: u64,
    pub last_sync: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MemoryStats {
    pub total_memories: u64,
    pub total_chunks: u64,
    pub total_embeddings: u64,
    pub storage_size_bytes: u64,
    pub last_updated: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SystemInfo {
    pub version: String,
    pub platform: String,
    pub arch: String,
    pub memory_usage: u64,
    pub disk_usage: u64,
}

// Basic greet command for testing
#[tauri::command]
pub async fn greet(name: &str) -> Result<String, String> {
    Ok(format!("Hello, {}! You've been greeted from Rust!", name))
}

// Vault management commands
#[tauri::command]
pub async fn create_vault(
    config: VaultConfig,
    master_password: String,
) -> Result<VaultStatus, String> {
    let vault_manager = VaultManager::new();
    vault_manager
        .create_vault(config, master_password)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn unlock_vault(master_password: String) -> Result<VaultStatus, String> {
    let vault_manager = VaultManager::new();
    vault_manager
        .unlock_vault(master_password)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_vault_status() -> Result<VaultStatus, String> {
    let vault_manager = VaultManager::new();
    vault_manager
        .get_status()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_vault_settings(
    name: Option<String>,
    description: Option<String>,
) -> Result<(), String> {
    let vault_manager = VaultManager::new();
    vault_manager
        .update_settings(name, description)
        .await
        .map_err(|e| e.to_string())
}

// Memory management commands
#[tauri::command]
pub async fn add_memory(entry: MemoryEntry) -> Result<String, String> {
    let memory_manager = MemoryManager::new();
    memory_manager
        .add_memory(entry)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn query_memory(request: QueryRequest) -> Result<QueryResult, String> {
    let memory_manager = MemoryManager::new();
    memory_manager
        .query_memory(request)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn search_memories(
    query: String,
    limit: Option<usize>,
    tags: Option<Vec<String>>,
) -> Result<Vec<MemoryEntry>, String> {
    let memory_manager = MemoryManager::new();
    memory_manager
        .search_memories(query, limit, tags)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_memory_stats() -> Result<MemoryStats, String> {
    let memory_manager = MemoryManager::new();
    memory_manager
        .get_stats()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_memory(id: String) -> Result<(), String> {
    let memory_manager = MemoryManager::new();
    memory_manager
        .delete_memory(id)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_memory(id: String, entry: MemoryEntry) -> Result<(), String> {
    let memory_manager = MemoryManager::new();
    memory_manager
        .update_memory(id, entry)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_citations(memory_id: String) -> Result<Vec<Citation>, String> {
    let memory_manager = MemoryManager::new();
    memory_manager
        .get_citations(memory_id)
        .await
        .map_err(|e| e.to_string())
}

// Insights and analytics
#[tauri::command]
pub async fn get_insights(
    period: String, // "daily", "weekly", "monthly"
) -> Result<serde_json::Value, String> {
    let memory_manager = MemoryManager::new();
    memory_manager
        .get_insights(period)
        .await
        .map_err(|e| e.to_string())
}

// Data management
#[tauri::command]
pub async fn export_data(format: String) -> Result<String, String> {
    let memory_manager = MemoryManager::new();
    memory_manager
        .export_data(format)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn import_data(data: String, format: String) -> Result<(), String> {
    let memory_manager = MemoryManager::new();
    memory_manager
        .import_data(data, format)
        .await
        .map_err(|e| e.to_string())
}

// System operations
#[tauri::command]
pub async fn sync_embeddings() -> Result<(), String> {
    let memory_manager = MemoryManager::new();
    memory_manager
        .sync_embeddings()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_system_info() -> Result<SystemInfo, String> {
    let memory_manager = MemoryManager::new();
    memory_manager
        .get_system_info()
        .await
        .map_err(|e| e.to_string())
}
