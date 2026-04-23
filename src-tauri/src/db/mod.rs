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
            CREATE TABLE IF NOT EXISTS task_groups (
                id TEXT PRIMARY KEY NOT NULL,
                name TEXT NOT NULL,
                description TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS tasks (
                id TEXT PRIMARY KEY NOT NULL,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                note TEXT NOT NULL DEFAULT '',
                completed INTEGER NOT NULL DEFAULT 0,
                completed_at TEXT NULL,
                archived_at TEXT NULL,
                priority TEXT NOT NULL DEFAULT 'medium',
                group_id TEXT NULL,
                due_at TEXT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                FOREIGN KEY(group_id) REFERENCES task_groups(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_task_groups_updated_at ON task_groups(updated_at DESC);
            CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
            CREATE INDEX IF NOT EXISTS idx_tasks_due_at ON tasks(due_at);
            CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);
            ",
        )
        .map_err(|error| format!("初始化任务表失败：{error}"))?;

    ensure_tasks_priority_column(&connection)?;
    ensure_tasks_group_column(&connection)?;
    ensure_tasks_v040_columns(&connection)?;
    ensure_tasks_group_index(&connection)?;

    Ok(())
}

#[cfg(test)]
mod tests;

/// 打开数据库连接。
pub fn open_connection(db_path: &PathBuf) -> Result<Connection, String> {
    Connection::open(db_path).map_err(|error| format!("打开数据库连接失败：{error}"))
}

fn ensure_tasks_group_column(connection: &Connection) -> Result<(), String> {
    let mut statement = connection
        .prepare("PRAGMA table_info(tasks)")
        .map_err(|error| format!("读取 tasks 表结构失败：{error}"))?;

    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| format!("查询 tasks 表字段失败：{error}"))?;

    let has_group_id = columns
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("读取 tasks 表字段结果失败：{error}"))?
        .iter()
        .any(|column| column == "group_id");

    if !has_group_id {
        connection
            .execute("ALTER TABLE tasks ADD COLUMN group_id TEXT NULL", [])
            .map_err(|error| format!("为 tasks 表补充 group_id 字段失败：{error}"))?;
    }

    Ok(())
}

fn ensure_tasks_priority_column(connection: &Connection) -> Result<(), String> {
    let mut statement = connection
        .prepare("PRAGMA table_info(tasks)")
        .map_err(|error| format!("读取 tasks 表结构失败：{error}"))?;

    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| format!("查询 tasks 表字段失败：{error}"))?;

    let has_priority = columns
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("读取 tasks 表字段结果失败：{error}"))?
        .iter()
        .any(|column| column == "priority");

    if !has_priority {
        connection
            .execute(
                "ALTER TABLE tasks ADD COLUMN priority TEXT NOT NULL DEFAULT 'medium'",
                [],
            )
            .map_err(|error| format!("为 tasks 表补充 priority 字段失败：{error}"))?;
    }

    Ok(())
}

fn ensure_tasks_v040_columns(connection: &Connection) -> Result<(), String> {
    let mut statement = connection
        .prepare("PRAGMA table_info(tasks)")
        .map_err(|error| format!("璇诲彇 tasks 琛ㄧ粨鏋勫け璐ワ細{error}"))?;

    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| format!("鏌ヨ tasks 琛ㄥ瓧娈靛け璐ワ細{error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("璇诲彇 tasks 琛ㄥ瓧娈电粨鏋滃け璐ワ細{error}"))?;

    if !columns.iter().any(|column| column == "note") {
        connection
            .execute("ALTER TABLE tasks ADD COLUMN note TEXT NOT NULL DEFAULT ''", [])
            .map_err(|error| format!("add tasks.note column failed: {error}"))?;
    }

    if !columns.iter().any(|column| column == "completed_at") {
        connection
            .execute("ALTER TABLE tasks ADD COLUMN completed_at TEXT NULL", [])
            .map_err(|error| format!("add tasks.completed_at column failed: {error}"))?;
    }

    if !columns.iter().any(|column| column == "archived_at") {
        connection
            .execute("ALTER TABLE tasks ADD COLUMN archived_at TEXT NULL", [])
            .map_err(|error| format!("add tasks.archived_at column failed: {error}"))?;
    }

    connection
        .execute(
            "UPDATE tasks SET completed_at = updated_at WHERE completed = 1 AND completed_at IS NULL",
            [],
        )
        .map_err(|error| format!("backfill tasks.completed_at failed: {error}"))?;

    connection
        .execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at DESC)",
            [],
        )
        .map_err(|error| format!("create tasks.completed_at index failed: {error}"))?;

    connection
        .execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON tasks(archived_at DESC)",
            [],
        )
        .map_err(|error| format!("create tasks.archived_at index failed: {error}"))?;

    Ok(())
}

fn ensure_tasks_group_index(connection: &Connection) -> Result<(), String> {
    connection
        .execute(
            "CREATE INDEX IF NOT EXISTS idx_tasks_group_id ON tasks(group_id)",
            [],
        )
        .map_err(|error| format!("为 tasks.group_id 创建索引失败：{error}"))?;

    Ok(())
}
