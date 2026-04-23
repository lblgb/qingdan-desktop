use rusqlite::{params, params_from_iter, types::Value};
use tauri::State;
use time::{format_description::well_known::Rfc3339, OffsetDateTime};
use uuid::Uuid;

use crate::{
    db::{open_connection, DatabaseState},
    models::{
        BulkUpdateTasksInput, CreateTaskGroupInput, CreateTaskInput, TaskGroup, TaskItem,
        TaskArchiveFilter, TaskPriority, TaskQueryInput, TaskQuerySortBy, TaskQueryStatus,
        UpdateTaskGroupInput, UpdateTaskInput,
    },
};

fn task_row_to_item(row: &rusqlite::Row<'_>) -> Result<TaskItem, rusqlite::Error> {
    Ok(TaskItem {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        note: row.get(3)?,
        completed: row.get::<_, i64>(4)? != 0,
        completed_at: row.get(5)?,
        archived_at: row.get(6)?,
        priority: TaskPriority::from_db_value(&row.get::<_, String>(7)?),
        group_id: row.get(8)?,
        due_at: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

fn task_sort_clause(sort_by: TaskQuerySortBy) -> &'static str {
    match sort_by {
        TaskQuerySortBy::Default => {
            "completed ASC, CASE WHEN completed = 0 AND due_at IS NOT NULL THEN 0 ELSE 1 END ASC, CASE WHEN completed = 0 AND due_at IS NOT NULL THEN due_at END ASC, updated_at DESC"
        }
        TaskQuerySortBy::DueDate => {
            "completed ASC, CASE WHEN due_at IS NULL THEN 1 ELSE 0 END ASC, due_at ASC, updated_at DESC"
        }
        TaskQuerySortBy::Priority => {
            "completed ASC, CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END ASC, CASE WHEN due_at IS NULL THEN 1 ELSE 0 END ASC, due_at ASC, updated_at DESC"
        }
        TaskQuerySortBy::Updated => "updated_at DESC",
    }
}

fn build_task_query(query: &TaskQueryInput) -> Result<(String, Vec<Value>), String> {
    let mut sql = String::from(
        "SELECT id, title, description, note, completed, completed_at, archived_at, priority, group_id, due_at, created_at, updated_at FROM tasks",
    );
    let mut predicates = Vec::new();
    let mut values = Vec::new();

    match query.archive.unwrap_or(TaskArchiveFilter::Active) {
        TaskArchiveFilter::Active => predicates.push("archived_at IS NULL".to_string()),
        TaskArchiveFilter::Archived => predicates.push("archived_at IS NOT NULL".to_string()),
        TaskArchiveFilter::All => {}
    }

    if let Some(status) = query.status {
        match status {
            TaskQueryStatus::Active => predicates.push("completed = 0".to_string()),
            TaskQueryStatus::Completed => predicates.push("completed = 1".to_string()),
        }
    }

    if let Some(group_id) = &query.group_id {
        if group_id == "ungrouped" {
            predicates.push("group_id IS NULL".to_string());
        } else {
            predicates.push("group_id = ?".to_string());
            values.push(Value::Text(group_id.clone()));
        }
    }

    if let Some(priority) = query.priority {
        predicates.push("priority = ?".to_string());
        values.push(Value::Text(priority.as_db_value().to_string()));
    }

    if let Some(date_range) = &query.date_range {
        if let Some(start) = &date_range.start {
            predicates.push("due_at IS NOT NULL".to_string());
            predicates.push("substr(due_at, 1, 10) >= ?".to_string());
            values.push(Value::Text(start.clone()));
        }

        if let Some(end) = &date_range.end {
            predicates.push("due_at IS NOT NULL".to_string());
            predicates.push("substr(due_at, 1, 10) <= ?".to_string());
            values.push(Value::Text(end.clone()));
        }
    }

    if !predicates.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&predicates.join(" AND "));
    }

    sql.push_str(" ORDER BY ");
    sql.push_str(task_sort_clause(query.sort_by.unwrap_or(TaskQuerySortBy::Default)));

    Ok((sql, values))
}

fn query_tasks_inner(state: &DatabaseState, query: &TaskQueryInput) -> Result<Vec<TaskItem>, String> {
    let connection = open_connection(&state.db_path)?;
    let (sql, values) = build_task_query(query)?;
    let mut statement = connection
        .prepare(&sql)
        .map_err(|error| format!("查询任务列表失败：{error}"))?;

    let rows = statement
        .query_map(params_from_iter(values), task_row_to_item)
        .map_err(|error| format!("映射任务列表失败：{error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("读取任务列表失败：{error}"))
}

fn list_tasks_inner(state: &DatabaseState) -> Result<Vec<TaskItem>, String> {
    query_tasks_inner(
        state,
        &TaskQueryInput {
            archive: Some(TaskArchiveFilter::All),
            ..TaskQueryInput::default()
        },
    )
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

fn bulk_update_tasks_inner(
    state: &DatabaseState,
    input: &BulkUpdateTasksInput,
) -> Result<Vec<TaskItem>, String> {
    if input.task_ids.is_empty() {
        return list_tasks_inner(state);
    }

    let mut connection = open_connection(&state.db_path)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("开启批量更新事务失败：{error}"))?;
    let timestamp = now_iso_string()?;
    let archive_only = input.priority.is_none()
        && input.group_id.is_none()
        && input.mark_completed.is_none()
        && input.archive == Some(true);

    for task_id in &input.task_ids {
        let mut set_clauses = Vec::new();
        let mut values = Vec::new();

        if let Some(priority) = input.priority {
            set_clauses.push("priority = ?");
            values.push(Value::Text(priority.as_db_value().to_string()));
        }

        if let Some(group_id) = &input.group_id {
            set_clauses.push("group_id = ?");
            match group_id {
                Some(group_id) => values.push(Value::Text(group_id.clone())),
                None => values.push(Value::Null),
            }
        }

        if let Some(mark_completed) = input.mark_completed {
            set_clauses.push("completed = ?");
            values.push(Value::Integer(if mark_completed { 1 } else { 0 }));
            if mark_completed {
                set_clauses.push("completed_at = CASE WHEN completed = 0 OR completed_at IS NULL THEN ? ELSE completed_at END");
                values.push(Value::Text(timestamp.clone()));
            } else {
                set_clauses.push("completed_at = ?");
                values.push(Value::Null);
            }
        }

        if let Some(archive) = input.archive {
            if archive {
                set_clauses
                    .push("archived_at = CASE WHEN completed = 1 THEN ? ELSE archived_at END");
                values.push(Value::Text(timestamp.clone()));
            } else {
                set_clauses.push("archived_at = ?");
                values.push(Value::Null);
            }
        }

        if set_clauses.is_empty() {
            continue;
        }

        set_clauses.push("updated_at = ?");
        values.push(Value::Text(timestamp.clone()));
        values.push(Value::Text(task_id.clone()));

        let mut sql = format!("UPDATE tasks SET {} WHERE id = ?", set_clauses.join(", "));
        if archive_only {
            sql.push_str(" AND completed = 1");
        }
        transaction
            .execute(&sql, params_from_iter(values))
            .map_err(|error| format!("批量更新任务失败：{error}"))?;
    }

    transaction
        .commit()
        .map_err(|error| format!("提交批量更新事务失败：{error}"))?;

    list_tasks_inner(state)
}

#[tauri::command]
pub fn list_tasks(state: State<'_, DatabaseState>) -> Result<Vec<TaskItem>, String> {
    list_tasks_inner(&state)
}

#[tauri::command]
pub fn query_tasks(
    input: TaskQueryInput,
    state: State<'_, DatabaseState>,
) -> Result<Vec<TaskItem>, String> {
    query_tasks_inner(&state, &input)
}

#[tauri::command]
pub fn list_task_groups(state: State<'_, DatabaseState>) -> Result<Vec<TaskGroup>, String> {
    list_task_groups_inner(&state)
}

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
            INSERT INTO tasks (id, title, description, note, completed, priority, group_id, due_at, created_at, updated_at)
            VALUES (?1, ?2, ?3, ?4, 0, ?5, ?6, ?7, ?8, ?9)
            ",
            params![
                Uuid::new_v4().to_string(),
                title,
                input.description.trim(),
                input.note.trim(),
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
                note = ?4,
                priority = ?5,
                due_at = ?6,
                group_id = ?7,
                updated_at = ?8
            WHERE id = ?1
            ",
            params![
                input.id,
                title,
                input.description.trim(),
                input.note.trim(),
                input.priority.as_db_value(),
                input.due_at,
                input.group_id,
                now_iso_string()?
            ],
        )
        .map_err(|error| format!("编辑任务失败：{error}"))?;

    list_tasks_inner(&state)
}

#[tauri::command]
pub fn toggle_task(task_id: String, state: State<'_, DatabaseState>) -> Result<Vec<TaskItem>, String> {
    let connection = open_connection(&state.db_path)?;

    connection
        .execute(
            "
            UPDATE tasks
            SET completed = CASE completed WHEN 1 THEN 0 ELSE 1 END,
                completed_at = CASE completed WHEN 1 THEN NULL ELSE ?2 END,
                updated_at = ?2
            WHERE id = ?1
            ",
            params![task_id, now_iso_string()?],
        )
        .map_err(|error| format!("更新任务状态失败：{error}"))?;

    list_tasks_inner(&state)
}

#[tauri::command]
pub fn delete_task(task_id: String, state: State<'_, DatabaseState>) -> Result<Vec<TaskItem>, String> {
    let connection = open_connection(&state.db_path)?;

    connection
        .execute("DELETE FROM tasks WHERE id = ?1", params![task_id])
        .map_err(|error| format!("删除任务失败：{error}"))?;

    list_tasks_inner(&state)
}

#[tauri::command]
pub fn bulk_update_tasks(
    input: BulkUpdateTasksInput,
    state: State<'_, DatabaseState>,
) -> Result<Vec<TaskItem>, String> {
    bulk_update_tasks_inner(&state, &input)
}

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

#[cfg(test)]
mod tests {
    use super::{bulk_update_tasks_inner, list_tasks_inner, query_tasks_inner};
    use crate::{
        db::{init_database, DatabaseState},
        models::{
            BulkUpdateTasksInput, TaskArchiveFilter, TaskPriority, TaskQueryInput, TaskQuerySortBy,
            TaskQueryStatus,
        },
    };
    use rusqlite::{params, Connection};
    use std::{fs, path::PathBuf};
    use uuid::Uuid;

    fn temp_db_path() -> PathBuf {
        std::env::temp_dir().join(format!("qingdan-task-query-{}.db", Uuid::new_v4()))
    }

    fn seed_task(
        connection: &Connection,
        title: &str,
        completed: bool,
        priority: &str,
        group_id: Option<&str>,
        due_at: Option<&str>,
        updated_at: &str,
    ) {
        connection
            .execute(
                "
                INSERT INTO tasks (
                    id, title, description, completed, priority, group_id, due_at, created_at, updated_at
                ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
                ",
                params![
                    Uuid::new_v4().to_string(),
                    title,
                    format!("{title} description"),
                    if completed { 1 } else { 0 },
                    priority,
                    group_id,
                    due_at,
                    "2026-04-14T00:00:00Z",
                    updated_at,
                ],
            )
            .expect("seed task");
    }

    fn seed_task_with_id(
        connection: &Connection,
        id: &str,
        title: &str,
        completed: bool,
        completed_at: Option<&str>,
        archived_at: Option<&str>,
        updated_at: &str,
    ) {
        connection
            .execute(
                "
                INSERT INTO tasks (
                    id, title, description, note, completed, completed_at, archived_at, priority,
                    group_id, due_at, created_at, updated_at
                ) VALUES (?1, ?2, ?3, '', ?4, ?5, ?6, 'medium', NULL, NULL, ?7, ?8)
                ",
                params![
                    id,
                    title,
                    format!("{title} description"),
                    if completed { 1 } else { 0 },
                    completed_at,
                    archived_at,
                    "2026-04-14T00:00:00Z",
                    updated_at,
                ],
            )
            .expect("seed task with id");
    }

    #[test]
    fn query_tasks_filters_active_urgent_tasks_when_sorted_by_priority() {
        let db_path = temp_db_path();
        fs::remove_file(&db_path).ok();
        init_database(&db_path).expect("initialize database");

        let connection = Connection::open(&db_path).expect("open database");
        let group_id = Uuid::new_v4().to_string();
        connection
            .execute(
                "
                INSERT INTO task_groups (id, name, description, created_at, updated_at)
                VALUES (?1, ?2, ?3, ?4, ?5)
                ",
                params![
                    group_id,
                    "Planning",
                    "Planning group",
                    "2026-04-14T00:00:00Z",
                    "2026-04-14T00:00:00Z"
                ],
            )
            .expect("seed group");

        seed_task(
            &connection,
            "urgent active",
            false,
            "urgent",
            Some(&group_id),
            Some("2026-04-15T09:00:00Z"),
            "2026-04-14T01:00:00Z",
        );
        seed_task(
            &connection,
            "high active",
            false,
            "high",
            Some(&group_id),
            Some("2026-04-16T09:00:00Z"),
            "2026-04-14T02:00:00Z",
        );
        seed_task(
            &connection,
            "urgent completed",
            true,
            "urgent",
            Some(&group_id),
            Some("2026-04-17T09:00:00Z"),
            "2026-04-14T03:00:00Z",
        );

        let state = DatabaseState { db_path };
        let query = TaskQueryInput {
            status: Some(TaskQueryStatus::Active),
            group_id: Some(group_id),
            priority: Some(TaskPriority::Urgent),
            date_range: None,
            sort_by: Some(TaskQuerySortBy::Priority),
            archive: None,
        };

        let tasks = query_tasks_inner(&state, &query).expect("query tasks");

        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "urgent active");
    }

    #[test]
    fn bulk_complete_preserves_existing_completed_at_for_completed_tasks() {
        let db_path = temp_db_path();
        fs::remove_file(&db_path).ok();
        init_database(&db_path).expect("initialize database");

        let connection = Connection::open(&db_path).expect("open database");
        let already_completed_id = Uuid::new_v4().to_string();
        let already_completed_null_id = Uuid::new_v4().to_string();
        let open_id = Uuid::new_v4().to_string();
        let original_completed_at = "2026-04-14T03:00:00Z";
        seed_task_with_id(
            &connection,
            &already_completed_id,
            "already completed",
            true,
            Some(original_completed_at),
            None,
            "2026-04-14T04:00:00Z",
        );
        seed_task_with_id(
            &connection,
            &already_completed_null_id,
            "already completed without timestamp",
            true,
            None,
            None,
            "2026-04-14T04:30:00Z",
        );
        let seeded_completed_at: Option<String> = connection
            .query_row(
                "SELECT completed_at FROM tasks WHERE id = ?1",
                params![already_completed_null_id],
                |row| row.get(0),
            )
            .expect("read seeded completed_at");
        assert!(seeded_completed_at.is_none());
        seed_task_with_id(
            &connection,
            &open_id,
            "open task",
            false,
            None,
            None,
            "2026-04-14T05:00:00Z",
        );

        let state = DatabaseState { db_path };
        let tasks = bulk_update_tasks_inner(
            &state,
            &BulkUpdateTasksInput {
                task_ids: vec![
                    already_completed_id.clone(),
                    already_completed_null_id.clone(),
                    open_id.clone(),
                ],
                priority: None,
                group_id: None,
                mark_completed: Some(true),
                archive: None,
            },
        )
        .expect("bulk complete tasks");

        let already_completed = tasks
            .iter()
            .find(|task| task.id == already_completed_id)
            .expect("already completed task returned");
        let already_completed_without_timestamp = tasks
            .iter()
            .find(|task| task.id == already_completed_null_id)
            .expect("already completed task without timestamp returned");
        let opened_then_completed = tasks
            .iter()
            .find(|task| task.id == open_id)
            .expect("open task returned");

        assert_eq!(
            already_completed.completed_at.as_deref(),
            Some(original_completed_at)
        );
        assert!(already_completed_without_timestamp.completed_at.is_some());
        assert!(opened_then_completed.completed_at.is_some());
    }

    #[test]
    fn list_tasks_returns_active_and_archived_tasks_for_store_hydration() {
        let db_path = temp_db_path();
        fs::remove_file(&db_path).ok();
        init_database(&db_path).expect("initialize database");

        let connection = Connection::open(&db_path).expect("open database");
        let active_id = Uuid::new_v4().to_string();
        let archived_id = Uuid::new_v4().to_string();
        seed_task_with_id(
            &connection,
            &active_id,
            "active",
            false,
            None,
            None,
            "2026-04-14T06:00:00Z",
        );
        seed_task_with_id(
            &connection,
            &archived_id,
            "archived",
            true,
            Some("2026-04-14T07:00:00Z"),
            Some("2026-04-14T08:00:00Z"),
            "2026-04-14T09:00:00Z",
        );

        let state = DatabaseState { db_path };
        let tasks = list_tasks_inner(&state).expect("list tasks");

        assert!(tasks.iter().any(|task| task.id == active_id));
        assert!(tasks.iter().any(|task| task.id == archived_id));
    }

    #[test]
    fn query_tasks_archive_all_returns_active_and_archived_tasks() {
        let db_path = temp_db_path();
        fs::remove_file(&db_path).ok();
        init_database(&db_path).expect("initialize database");

        let connection = Connection::open(&db_path).expect("open database");
        let active_id = Uuid::new_v4().to_string();
        let archived_id = Uuid::new_v4().to_string();
        seed_task_with_id(
            &connection,
            &active_id,
            "active",
            false,
            None,
            None,
            "2026-04-14T06:00:00Z",
        );
        seed_task_with_id(
            &connection,
            &archived_id,
            "archived",
            true,
            Some("2026-04-14T07:00:00Z"),
            Some("2026-04-14T08:00:00Z"),
            "2026-04-14T09:00:00Z",
        );

        let state = DatabaseState { db_path };
        let tasks = query_tasks_inner(
            &state,
            &TaskQueryInput {
                status: None,
                group_id: None,
                priority: None,
                date_range: None,
                sort_by: Some(TaskQuerySortBy::Updated),
                archive: Some(TaskArchiveFilter::All),
            },
        )
        .expect("query all archive tasks");

        assert!(tasks.iter().any(|task| task.id == active_id));
        assert!(tasks.iter().any(|task| task.id == archived_id));
    }

    #[test]
    fn bulk_archive_only_leaves_incomplete_tasks_unchanged() {
        let db_path = temp_db_path();
        fs::remove_file(&db_path).ok();
        init_database(&db_path).expect("initialize database");

        let connection = Connection::open(&db_path).expect("open database");
        let incomplete_id = Uuid::new_v4().to_string();
        let completed_id = Uuid::new_v4().to_string();
        let incomplete_updated_at = "2026-04-14T06:00:00Z";
        seed_task_with_id(
            &connection,
            &incomplete_id,
            "incomplete",
            false,
            None,
            None,
            incomplete_updated_at,
        );
        seed_task_with_id(
            &connection,
            &completed_id,
            "completed",
            true,
            Some("2026-04-14T07:00:00Z"),
            None,
            "2026-04-14T08:00:00Z",
        );

        let state = DatabaseState {
            db_path: db_path.clone(),
        };
        let tasks = bulk_update_tasks_inner(
            &state,
            &BulkUpdateTasksInput {
                task_ids: vec![incomplete_id.clone(), completed_id.clone()],
                priority: None,
                group_id: None,
                mark_completed: None,
                archive: Some(true),
            },
        )
        .expect("bulk archive tasks");

        let incomplete = tasks
            .iter()
            .find(|task| task.id == incomplete_id)
            .expect("incomplete task returned");
        let archived_at = connection
            .query_row(
                "SELECT archived_at FROM tasks WHERE id = ?1",
                params![completed_id],
                |row| row.get::<_, Option<String>>(0),
            )
            .expect("read completed task archive timestamp");

        assert_eq!(incomplete.updated_at, incomplete_updated_at);
        assert!(incomplete.archived_at.is_none());
        assert!(archived_at.is_some());
    }
}
