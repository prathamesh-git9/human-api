// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod database;
mod crypto;
mod vault;
mod memory;

use tauri::Manager;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_fs::FsExt;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_shell::ShellExt;

#[tokio::main]
async fn main() {

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::greet,
            commands::create_vault,
            commands::unlock_vault,
            commands::add_memory,
            commands::query_memory,
            commands::search_memories,
            commands::get_insights,
            commands::export_data,
            commands::import_data,
            commands::get_vault_status,
            commands::update_vault_settings,
            commands::get_memory_stats,
            commands::delete_memory,
            commands::update_memory,
            commands::get_citations,
            commands::sync_embeddings,
            commands::get_system_info
        ])
        .setup(|app| {
            // Initialize database
            tauri::async_runtime::spawn(async {
                if let Err(e) = database::init().await {
                    eprintln!("Failed to initialize database: {}", e);
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}