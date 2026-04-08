//! 文件说明：数据库模块，负责初始化 SQLite 文件并提供连接能力。

use std::{fs, path::PathBuf};

use rusqlite::Connection;

/// SQLite 文件名。
pub const SQLITE_FILE_NAME: &str = "qingdan.db";

/// 数据库状态。
#[derive(Debug, Clone)]
pub struct DatabaseState {
    pub db_path: PathBuf,
}

/// 初始化数据库文件和任务表。
pub fn init_database(db_path: &PathBuf) -> Result<(), String> {
    if let Some(parent) = db_path.parent() {
        fs::create_dir_all(parent).map_err(|error| format!("创建数据库目录失败：{error}"))?;
    }

    let connection = Connection::open(db_path).map_err(|error| format!("打开数据库失败：{error}"))?;

    connection
        .execute_batch(
            "
            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                completed INTEGER NOT NULL DEFAULT 0,
                due_at TEXT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
            CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
            CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);
            ",
        )
        .map_err(|error| format!("初始化任务表失败：{error}"))?;

    Ok(())
}

/// 打开数据库连接。
pub fn open_connection(db_path: &PathBuf) -> Result<Connection, String> {
    Connection::open(db_path).map_err(|error| format!("打开数据库连接失败：{error}"))
}
