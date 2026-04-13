//! 文件说明：Tauri 宿主层库入口，负责组装命令、插件和应用生命周期。

pub mod commands;
pub mod db;
pub mod models;

use tauri::Manager;
use tauri::path::BaseDirectory;

/// 启动 Tauri 应用。
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::system::ping,
            commands::tasks::list_tasks,
            commands::tasks::query_tasks,
            commands::tasks::list_task_groups,
            commands::tasks::create_task,
            commands::tasks::update_task,
            commands::tasks::toggle_task,
            commands::tasks::delete_task,
            commands::tasks::bulk_update_tasks,
            commands::tasks::create_task_group,
            commands::tasks::update_task_group,
            commands::tasks::delete_task_group,
            commands::tasks::assign_task_group
        ])
        .setup(|app| {
            let db_path = app
                .path()
                .resolve(db::SQLITE_FILE_NAME, BaseDirectory::AppData)
                .map_err(|error| format!("解析数据库路径失败：{error}"))?;

            db::init_database(&db_path)?;
            app.manage(db::DatabaseState { db_path });

            let main_window = app.get_webview_window("main");
            if let Some(window) = main_window {
                let _ = window.set_title("轻单");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("运行 Tauri 应用失败");
}
