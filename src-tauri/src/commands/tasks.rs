//! 文件说明：任务命令模块，负责提供基础任务 CRUD 的 Tauri 命令边界。

use rusqlite::params;
use tauri::State;
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use uuid::Uuid;

use crate::{
    db::{open_connection, DatabaseState},
    models::{CreateTaskInput, TaskItem, UpdateTaskInput},
};

fn list_tasks_inner(state: &DatabaseState) -> Result<Vec<TaskItem>, String> {
    let connection = open_connection(&state.db_path)?;
    let mut statement = connection
        .prepare(
            "
            SELECT id, title, description, completed, due_at, created_at, updated_at
            FROM tasks
            ORDER BY
                completed ASC,
                CASE WHEN completed = 0 AND due_at IS NOT NULL THEN 0 ELSE 1 END ASC,
                CASE WHEN completed = 0 AND due_at IS NOT NULL THEN due_at END ASC,
                updated_at DESC
            ",
        )
        .map_err(|error| format!("查询任务列表失败：{error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(TaskItem {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                completed: row.get::<_, i64>(3)? != 0,
                due_at: row.get(4)?,
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(|error| format!("映射任务列表失败：{error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("读取任务列表失败：{error}"))
}

fn now_iso_string() -> Result<String, String> {
    OffsetDateTime::now_utc()
        .format(&Rfc3339)
        .map_err(|error| format!("生成时间戳失败：{error}"))
}

/// 查询任务列表。
#[tauri::command]
pub fn list_tasks(state: State<'_, DatabaseState>) -> Result<Vec<TaskItem>, String> {
    list_tasks_inner(&state)
}

/// 创建任务。
#[tauri::command]
pub fn create_task(
    input: CreateTaskInput,
    state: State<'_, DatabaseState>,
) -> Result<Vec<TaskItem>, String> {
    let title = input.title.trim().to_string();
    if title.is_empty() {
        return Err("任务标题不能为空".to_string());
    }

    let timestamp = now_iso_string()?;
    let connection = open_connection(&state.db_path)?;

    connection
        .execute(
            "
            INSERT INTO tasks (id, title, description, completed, due_at, created_at, updated_at)
            VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6)
            ",
            params![
                Uuid::new_v4().to_string(),
                title,
                input.description.trim(),
                input.due_at,
                timestamp,
                timestamp
            ],
        )
        .map_err(|error| format!("创建任务失败：{error}"))?;

    list_tasks_inner(&state)
}

/// 编辑任务。
#[tauri::command]
pub fn update_task(
    input: UpdateTaskInput,
    state: State<'_, DatabaseState>,
) -> Result<Vec<TaskItem>, String> {
    let title = input.title.trim().to_string();
    if title.is_empty() {
        return Err("任务标题不能为空".to_string());
    }

    let connection = open_connection(&state.db_path)?;

    connection
        .execute(
            "
            UPDATE tasks
            SET title = ?2,
                description = ?3,
                due_at = ?4,
                updated_at = ?5
            WHERE id = ?1
            ",
            params![
                input.id,
                title,
                input.description.trim(),
                input.due_at,
                now_iso_string()?
            ],
        )
        .map_err(|error| format!("编辑任务失败：{error}"))?;

    list_tasks_inner(&state)
}

/// 切换任务完成状态。
#[tauri::command]
pub fn toggle_task(task_id: String, state: State<'_, DatabaseState>) -> Result<Vec<TaskItem>, String> {
    let connection = open_connection(&state.db_path)?;

    connection
        .execute(
            "
            UPDATE tasks
            SET completed = CASE completed WHEN 1 THEN 0 ELSE 1 END,
                updated_at = ?2
            WHERE id = ?1
            ",
            params![task_id, now_iso_string()?],
        )
        .map_err(|error| format!("更新任务状态失败：{error}"))?;

    list_tasks_inner(&state)
}

/// 删除任务。
#[tauri::command]
pub fn delete_task(task_id: String, state: State<'_, DatabaseState>) -> Result<Vec<TaskItem>, String> {
    let connection = open_connection(&state.db_path)?;

    connection
        .execute("DELETE FROM tasks WHERE id = ?1", params![task_id])
        .map_err(|error| format!("删除任务失败：{error}"))?;

    list_tasks_inner(&state)
}
