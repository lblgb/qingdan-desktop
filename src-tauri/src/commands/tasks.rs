//! 文件说明：任务命令模块，负责提供基础任务 CRUD 的 Tauri 命令边界。

use rusqlite::params;
use tauri::State;
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use uuid::Uuid;

use crate::{
    db::{open_connection, DatabaseState},
    models::{
        CreateTaskGroupInput, CreateTaskInput, TaskGroup, TaskItem, TaskPriority,
        UpdateTaskGroupInput, UpdateTaskInput,
    },
};

fn list_tasks_inner(state: &DatabaseState) -> Result<Vec<TaskItem>, String> {
    let connection = open_connection(&state.db_path)?;
    let mut statement = connection
        .prepare(
            "
            SELECT id, title, description, completed, priority, group_id, due_at, created_at, updated_at
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
                priority: TaskPriority::from_db_value(&row.get::<_, String>(4)?),
                group_id: row.get(5)?,
                due_at: row.get(6)?,
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
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

fn list_task_groups_inner(state: &DatabaseState) -> Result<Vec<TaskGroup>, String> {
    let connection = open_connection(&state.db_path)?;
    let mut statement = connection
        .prepare(
            "
            SELECT id, name, description, created_at, updated_at
            FROM task_groups
            ORDER BY updated_at DESC, created_at DESC
            ",
        )
        .map_err(|error| format!("查询任务组列表失败：{error}"))?;

    let rows = statement
        .query_map([], |row| {
            Ok(TaskGroup {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })
        .map_err(|error| format!("映射任务组列表失败：{error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("读取任务组列表失败：{error}"))
}

/// 查询任务列表。
#[tauri::command]
pub fn list_tasks(state: State<'_, DatabaseState>) -> Result<Vec<TaskItem>, String> {
    list_tasks_inner(&state)
}

/// 查询任务组列表。
#[tauri::command]
pub fn list_task_groups(state: State<'_, DatabaseState>) -> Result<Vec<TaskGroup>, String> {
    list_task_groups_inner(&state)
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
            INSERT INTO tasks (id, title, description, completed, priority, group_id, due_at, created_at, updated_at)
            VALUES (?1, ?2, ?3, 0, ?4, ?5, ?6, ?7, ?8)
            ",
            params![
                Uuid::new_v4().to_string(),
                title,
                input.description.trim(),
                input.priority.as_db_value(),
                input.group_id,
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
                priority = ?4,
                due_at = ?5,
                group_id = ?6,
                updated_at = ?7
            WHERE id = ?1
            ",
            params![
                input.id,
                title,
                input.description.trim(),
                input.priority.as_db_value(),
                input.due_at,
                input.group_id,
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

/// 创建任务组。
#[tauri::command]
pub fn create_task_group(
    input: CreateTaskGroupInput,
    state: State<'_, DatabaseState>,
) -> Result<Vec<TaskGroup>, String> {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err("任务组名称不能为空".to_string());
    }

    let timestamp = now_iso_string()?;
    let connection = open_connection(&state.db_path)?;

    connection
        .execute(
            "
            INSERT INTO task_groups (id, name, description, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, ?5)
            ",
            params![
                Uuid::new_v4().to_string(),
                name,
                input.description.trim(),
                timestamp,
                timestamp
            ],
        )
        .map_err(|error| format!("创建任务组失败：{error}"))?;

    list_task_groups_inner(&state)
}

/// 编辑任务组。
#[tauri::command]
pub fn update_task_group(
    input: UpdateTaskGroupInput,
    state: State<'_, DatabaseState>,
) -> Result<Vec<TaskGroup>, String> {
    let name = input.name.trim().to_string();
    if name.is_empty() {
        return Err("任务组名称不能为空".to_string());
    }

    let connection = open_connection(&state.db_path)?;

    connection
        .execute(
            "
            UPDATE task_groups
            SET name = ?2,
                description = ?3,
                updated_at = ?4
            WHERE id = ?1
            ",
            params![input.id, name, input.description.trim(), now_iso_string()?],
        )
        .map_err(|error| format!("编辑任务组失败：{error}"))?;

    list_task_groups_inner(&state)
}

/// 删除任务组。
#[tauri::command]
pub fn delete_task_group(
    group_id: String,
    state: State<'_, DatabaseState>,
) -> Result<Vec<TaskGroup>, String> {
    let mut connection = open_connection(&state.db_path)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("开启删除任务组事务失败：{error}"))?;

    transaction
        .execute(
            "
            UPDATE tasks
            SET group_id = NULL,
                updated_at = ?2
            WHERE group_id = ?1
            ",
            params![group_id, now_iso_string()?],
        )
        .map_err(|error| format!("迁移组内任务失败：{error}"))?;

    transaction
        .execute("DELETE FROM task_groups WHERE id = ?1", params![group_id])
        .map_err(|error| format!("删除任务组失败：{error}"))?;

    transaction
        .commit()
        .map_err(|error| format!("提交删除任务组事务失败：{error}"))?;

    list_task_groups_inner(&state)
}

/// 调整任务所属组。
#[tauri::command]
pub fn assign_task_group(
    task_id: String,
    group_id: Option<String>,
    state: State<'_, DatabaseState>,
) -> Result<Vec<TaskItem>, String> {
    let connection = open_connection(&state.db_path)?;

    connection
        .execute(
            "
            UPDATE tasks
            SET group_id = ?2,
                updated_at = ?3
            WHERE id = ?1
            ",
            params![task_id, group_id, now_iso_string()?],
        )
        .map_err(|error| format!("调整任务所属组失败：{error}"))?;

    list_tasks_inner(&state)
}
