mod db;
mod memory;
mod session;
mod sidecar;
mod skills;
mod commands;

use tauri::Manager;
use tracing_subscriber::EnvFilter;

pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive("lume=debug".parse().unwrap()))
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            let app_data = app.path().app_data_dir().expect("failed to resolve app data dir");
            std::fs::create_dir_all(&app_data).ok();

            let db = db::Database::init(&app_data)?;
            app.manage(db);

            let mem = memory::MemoryManager::new(&app_data)?;
            app.manage(mem);

            let skills = skills::SkillRegistry::new(&app_data)?;
            app.manage(skills);

            // Initialize sidecar manager (agent process spawned on first chat)
            let sidecar_mgr = sidecar::SidecarManager::new();
            app.manage(sidecar_mgr);

            tracing::info!("Lume initialized at {:?}", app_data);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::send_message,
            commands::get_sessions,
            commands::create_session,
            commands::get_session_messages,
            commands::get_memory_profile,
            commands::update_memory,
            commands::search_memory,
            commands::list_skills,
            commands::get_skill,
            commands::get_harness_stats,
            commands::save_onboarding,
            commands::get_settings,
            commands::save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Lume");
}
