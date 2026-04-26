//! 文件说明：系统级命令示例，用于验证前后端调用链已接通。

use std::{fs, path::PathBuf};

use rusqlite::Connection;
use tauri::State;

use crate::{
    commands::tasks::{list_task_groups_inner, query_tasks_inner},
    db::{create_backup_file, open_connection, restore_backup_file, DatabaseState},
    models::{
        BackupCommandResult, CreateBackupInput, ExportCommandResult, ExportFormat,
        ExportScope, ExportTasksInput, ReminderPreferencesExport, RestoreBackupInput,
        TaskGroup, TaskItem, TaskPriority,
    },
};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportWorkspaceSnapshot {
    tasks: Vec<TaskItem>,
    task_groups: Vec<TaskGroup>,
    reminder_preferences: ReminderPreferencesExport,
}

struct ExportCsvRow {
    task: TaskItem,
    group_name: String,
}

/// 返回基础健康检查信息。
#[tauri::command]
pub fn ping() -> String {
    "qingdan-desktop-ready".to_string()
}

fn create_backup_inner(
    state: &DatabaseState,
    input: CreateBackupInput,
) -> Result<BackupCommandResult, String> {
    let backup_path = PathBuf::from(&input.backup_path);
    create_backup_file(&state.db_path, &backup_path)?;
    Ok(BackupCommandResult {
        backup_path: input.backup_path,
    })
}

fn restore_backup_inner(
    state: &DatabaseState,
    input: RestoreBackupInput,
) -> Result<BackupCommandResult, String> {
    let backup_path = PathBuf::from(&input.backup_path);
    restore_backup_file(&state.db_path, &backup_path)?;
    Ok(BackupCommandResult {
        backup_path: input.backup_path,
    })
}

fn export_task_row_to_item(row: &rusqlite::Row<'_>) -> Result<TaskItem, rusqlite::Error> {
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

fn load_all_tasks_for_export(connection: &Connection) -> Result<Vec<TaskItem>, String> {
    let mut statement = connection
        .prepare(
            "
            SELECT id, title, description, note, completed, completed_at, archived_at, priority,
                   group_id, due_at, created_at, updated_at
            FROM tasks
            ORDER BY created_at DESC, updated_at DESC
            ",
        )
        .map_err(|error| format!("prepare export task query failed: {error}"))?;

    let rows = statement
        .query_map([], export_task_row_to_item)
        .map_err(|error| format!("run export task query failed: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("read export task rows failed: {error}"))
}

fn escape_csv_field(value: &str) -> String {
    if value.contains([',', '"', '\n', '\r']) {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

fn serialize_tasks_as_csv(rows: &[ExportCsvRow]) -> String {
    let mut lines = vec![String::from(
        "id,title,description,note,completed,completedAt,archivedAt,groupId,groupName,dueAt,priority,createdAt,updatedAt",
    )];

    for row in rows {
        let task = &row.task;
        let row = [
            task.id.as_str(),
            task.title.as_str(),
            task.description.as_str(),
            task.note.as_str(),
            if task.completed { "true" } else { "false" },
            task.completed_at.as_deref().unwrap_or(""),
            task.archived_at.as_deref().unwrap_or(""),
            task.group_id.as_deref().unwrap_or(""),
            row.group_name.as_str(),
            task.due_at.as_deref().unwrap_or(""),
            task.priority.as_db_value(),
            task.created_at.as_str(),
            task.updated_at.as_str(),
        ]
        .into_iter()
        .map(escape_csv_field)
        .collect::<Vec<_>>()
        .join(",");
        lines.push(row);
    }

    lines.join("\n")
}

fn export_tasks_inner(
    state: &DatabaseState,
    input: ExportTasksInput,
) -> Result<ExportCommandResult, String> {
    let export_path = PathBuf::from(&input.export_path);
    if let Some(parent) = export_path.parent() {
        if !parent.as_os_str().is_empty() {
            fs::create_dir_all(parent)
                .map_err(|error| format!("create export directory failed: {error}"))?;
        }
    }

    let tasks = match input.scope {
        ExportScope::All => {
            let connection = open_connection(&state.db_path)?;
            load_all_tasks_for_export(&connection)?
        }
        ExportScope::Filtered => {
            let query = input
                .query
                .clone()
                .ok_or_else(|| "filtered export requires query payload".to_string())?;
            query_tasks_inner(state, &query)?
        }
    };
    let all_task_groups = list_task_groups_inner(state)?;
    let task_groups = match input.scope {
        ExportScope::All => all_task_groups,
        ExportScope::Filtered => all_task_groups
            .into_iter()
            .filter(|group| tasks.iter().any(|task| task.group_id.as_deref() == Some(group.id.as_str())))
            .collect::<Vec<_>>(),
    };
    let csv_rows = tasks
        .iter()
        .cloned()
        .map(|task| ExportCsvRow {
            group_name: task
                .group_id
                .as_ref()
                .and_then(|group_id| task_groups.iter().find(|group| &group.id == group_id))
                .map(|group| group.name.clone())
                .unwrap_or_default(),
            task,
        })
        .collect::<Vec<_>>();
    let contents = match input.format {
        ExportFormat::Json => serde_json::to_string_pretty(&ExportWorkspaceSnapshot {
            tasks,
            task_groups,
            reminder_preferences: input.reminder_preferences,
        })
        .map_err(|error| format!("serialize json export failed: {error}"))?,
        ExportFormat::Csv => serialize_tasks_as_csv(&csv_rows),
    };

    fs::write(&export_path, contents)
        .map_err(|error| format!("write export file failed: {error}"))?;

    Ok(ExportCommandResult {
        export_path: input.export_path,
    })
}

#[tauri::command]
pub fn create_backup(
    input: CreateBackupInput,
    state: State<'_, DatabaseState>,
) -> Result<BackupCommandResult, String> {
    create_backup_inner(&state, input)
}

#[tauri::command]
pub fn restore_backup(
    input: RestoreBackupInput,
    state: State<'_, DatabaseState>,
) -> Result<BackupCommandResult, String> {
    restore_backup_inner(&state, input)
}

#[tauri::command]
pub fn export_tasks(
    input: ExportTasksInput,
    state: State<'_, DatabaseState>,
) -> Result<ExportCommandResult, String> {
    export_tasks_inner(&state, input)
}

#[cfg(test)]
mod tests {
    use super::{create_backup_inner, restore_backup_inner};
    use crate::{
        db::{init_database, DatabaseState},
        models::{
            CreateBackupInput, ExportTasksInput, ReminderPreferencesExport, RestoreBackupInput,
        },
    };
    use rusqlite::{params, Connection};
    use serde_json::Value;
    use std::fs;
    use uuid::Uuid;

    fn temp_db_path() -> std::path::PathBuf {
        std::env::temp_dir().join(format!("qingdan-system-command-{}.db", Uuid::new_v4()))
    }

    #[test]
    fn create_backup_command_returns_backup_path() {
        let db_path = temp_db_path();
        let backup_path = std::env::temp_dir().join(format!("qingdan-system-backup-{}.db", Uuid::new_v4()));
        fs::remove_file(&db_path).ok();
        fs::remove_file(&backup_path).ok();
        init_database(&db_path).expect("initialize database");

        let connection = Connection::open(&db_path).expect("open database");
        connection
            .execute(
                "
                INSERT INTO tasks (
                    id, title, description, note, completed, completed_at, archived_at, priority,
                    group_id, due_at, created_at, updated_at
                ) VALUES (?1, 'system backup', '', '', 0, NULL, NULL, 'medium', NULL, NULL, ?2, ?3)
                ",
                params![
                    Uuid::new_v4().to_string(),
                    "2026-04-25T00:00:00Z",
                    "2026-04-25T00:00:00Z"
                ],
            )
            .expect("seed database");
        drop(connection);

        let state = DatabaseState {
            db_path: db_path.clone(),
        };
        let result = create_backup_inner(
            &state,
            CreateBackupInput {
                backup_path: backup_path.to_string_lossy().into_owned(),
            },
        )
        .expect("create backup command");

        assert_eq!(result.backup_path, backup_path.to_string_lossy());
        assert!(backup_path.exists());
    }

    #[test]
    fn restore_backup_command_returns_backup_path_after_restore() {
        let db_path = temp_db_path();
        let backup_path = std::env::temp_dir().join(format!("qingdan-system-restore-{}.db", Uuid::new_v4()));
        fs::remove_file(&db_path).ok();
        fs::remove_file(&backup_path).ok();
        init_database(&db_path).expect("initialize database");

        let connection = Connection::open(&db_path).expect("open database");
        connection
            .execute(
                "
                INSERT INTO tasks (
                    id, title, description, note, completed, completed_at, archived_at, priority,
                    group_id, due_at, created_at, updated_at
                ) VALUES (?1, 'original', '', '', 0, NULL, NULL, 'medium', NULL, NULL, ?2, ?3)
                ",
                params![
                    Uuid::new_v4().to_string(),
                    "2026-04-25T00:00:00Z",
                    "2026-04-25T00:00:00Z"
                ],
            )
            .expect("seed original database");
        drop(connection);

        fs::copy(&db_path, &backup_path).expect("copy backup file");

        let mutated_connection = Connection::open(&db_path).expect("reopen database");
        mutated_connection
            .execute("DELETE FROM tasks", [])
            .expect("clear database");
        mutated_connection
            .execute(
                "
                INSERT INTO tasks (
                    id, title, description, note, completed, completed_at, archived_at, priority,
                    group_id, due_at, created_at, updated_at
                ) VALUES (?1, 'mutated', '', '', 0, NULL, NULL, 'medium', NULL, NULL, ?2, ?3)
                ",
                params![
                    Uuid::new_v4().to_string(),
                    "2026-04-25T01:00:00Z",
                    "2026-04-25T01:00:00Z"
                ],
            )
            .expect("seed mutated database");
        drop(mutated_connection);

        let state = DatabaseState {
            db_path: db_path.clone(),
        };
        let result = restore_backup_inner(
            &state,
            RestoreBackupInput {
                backup_path: backup_path.to_string_lossy().into_owned(),
            },
        )
        .expect("restore backup command");

        let restored_connection = Connection::open(&db_path).expect("open restored database");
        let title = restored_connection
            .query_row("SELECT title FROM tasks LIMIT 1", [], |row| row.get::<_, String>(0))
            .expect("read restored task");

        assert_eq!(result.backup_path, backup_path.to_string_lossy());
        assert_eq!(title, "original");
    }

    #[test]
    fn export_tasks_command_writes_full_json_export() {
        let db_path = temp_db_path();
        let export_path = std::env::temp_dir().join(format!("qingdan-export-{}.json", Uuid::new_v4()));
        fs::remove_file(&db_path).ok();
        fs::remove_file(&export_path).ok();
        init_database(&db_path).expect("initialize database");

        let connection = Connection::open(&db_path).expect("open database");
        connection
            .execute(
                "
                INSERT INTO tasks (
                    id, title, description, note, completed, completed_at, archived_at, priority,
                    group_id, due_at, created_at, updated_at
                ) VALUES (?1, 'exported task', '', '', 0, NULL, NULL, 'medium', NULL, NULL, ?2, ?3)
                ",
                params![
                    Uuid::new_v4().to_string(),
                    "2026-04-25T00:00:00Z",
                    "2026-04-25T00:00:00Z"
                ],
            )
            .expect("seed database");
        drop(connection);

        let state = DatabaseState {
            db_path: db_path.clone(),
        };
        let result = super::export_tasks_inner(
            &state,
            ExportTasksInput {
                export_path: export_path.to_string_lossy().into_owned(),
                format: crate::models::ExportFormat::Json,
                scope: crate::models::ExportScope::All,
                reminder_preferences: ReminderPreferencesExport {
                    enable_in_app: true,
                    enable_desktop: true,
                    priority_threshold: "high".to_string(),
                    offset_preset: "1-hour".to_string(),
                    custom_offset_minutes: 60,
                },
                query: None,
            },
        )
        .expect("export tasks command");

        let exported = fs::read_to_string(&export_path).expect("read export");
        let exported_json: Value = serde_json::from_str(&exported).expect("parse json export");
        assert_eq!(result.export_path, export_path.to_string_lossy());
        assert_eq!(exported_json["tasks"][0]["title"], "exported task");
        assert_eq!(exported_json["taskGroups"], Value::Array(vec![]));
        assert_eq!(exported_json["reminderPreferences"]["priorityThreshold"], "high");
    }

    #[test]
    fn export_tasks_command_writes_full_csv_export() {
        let db_path = temp_db_path();
        let export_path = std::env::temp_dir().join(format!("qingdan-export-{}.csv", Uuid::new_v4()));
        fs::remove_file(&db_path).ok();
        fs::remove_file(&export_path).ok();
        init_database(&db_path).expect("initialize database");

        let connection = Connection::open(&db_path).expect("open database");
        let group_id = Uuid::new_v4().to_string();
        connection
            .execute(
                "
                INSERT INTO task_groups (id, name, description, created_at, updated_at)
                VALUES (?1, 'Alpha Group', '', ?2, ?3)
                ",
                params![group_id, "2026-04-25T00:00:00Z", "2026-04-25T00:00:00Z"],
            )
            .expect("seed task group");
        connection
            .execute(
                "
                INSERT INTO tasks (
                    id, title, description, note, completed, completed_at, archived_at, priority,
                    group_id, due_at, created_at, updated_at
                ) VALUES (?1, 'export csv task', '', '', 0, NULL, NULL, 'medium', ?2, NULL, ?3, ?4)
                ",
                params![
                    Uuid::new_v4().to_string(),
                    group_id,
                    "2026-04-25T00:00:00Z",
                    "2026-04-25T00:00:00Z"
                ],
            )
            .expect("seed database");
        drop(connection);

        let state = DatabaseState {
            db_path: db_path.clone(),
        };
        let result = super::export_tasks_inner(
            &state,
            ExportTasksInput {
                export_path: export_path.to_string_lossy().into_owned(),
                format: crate::models::ExportFormat::Csv,
                scope: crate::models::ExportScope::All,
                reminder_preferences: ReminderPreferencesExport {
                    enable_in_app: true,
                    enable_desktop: false,
                    priority_threshold: "urgent".to_string(),
                    offset_preset: "at-time".to_string(),
                    custom_offset_minutes: 0,
                },
                query: None,
            },
        )
        .expect("export tasks command");

        let exported = fs::read_to_string(&export_path).expect("read export");
        assert_eq!(result.export_path, export_path.to_string_lossy());
        assert!(exported.contains("groupName"));
        assert!(exported.contains("export csv task"));
        assert!(exported.contains("Alpha Group"));
    }

    #[test]
    fn export_tasks_command_writes_filtered_csv_export() {
        let db_path = temp_db_path();
        let export_path =
            std::env::temp_dir().join(format!("qingdan-export-filtered-{}.csv", Uuid::new_v4()));
        fs::remove_file(&db_path).ok();
        fs::remove_file(&export_path).ok();
        init_database(&db_path).expect("initialize database");

        let connection = Connection::open(&db_path).expect("open database");
        connection
            .execute(
                "
                INSERT INTO tasks (
                    id, title, description, note, completed, completed_at, archived_at, priority,
                    group_id, due_at, created_at, updated_at
                ) VALUES (?1, 'active task', '', '', 0, NULL, NULL, 'high', NULL, NULL, ?2, ?3)
                ",
                params![
                    Uuid::new_v4().to_string(),
                    "2026-04-25T00:00:00Z",
                    "2026-04-25T00:00:00Z"
                ],
            )
            .expect("seed active task");
        connection
            .execute(
                "
                INSERT INTO tasks (
                    id, title, description, note, completed, completed_at, archived_at, priority,
                    group_id, due_at, created_at, updated_at
                ) VALUES (?1, 'completed task', '', '', 1, ?2, NULL, 'high', NULL, NULL, ?3, ?4)
                ",
                params![
                    Uuid::new_v4().to_string(),
                    "2026-04-25T01:00:00Z",
                    "2026-04-25T00:00:00Z",
                    "2026-04-25T01:00:00Z"
                ],
            )
            .expect("seed completed task");
        drop(connection);

        let state = DatabaseState {
            db_path: db_path.clone(),
        };
        let result = super::export_tasks_inner(
            &state,
            ExportTasksInput {
                export_path: export_path.to_string_lossy().into_owned(),
                format: crate::models::ExportFormat::Csv,
                scope: crate::models::ExportScope::Filtered,
                reminder_preferences: ReminderPreferencesExport {
                    enable_in_app: true,
                    enable_desktop: false,
                    priority_threshold: "high".to_string(),
                    offset_preset: "1-hour".to_string(),
                    custom_offset_minutes: 60,
                },
                query: Some(crate::models::TaskQueryInput {
                    status: Some(crate::models::TaskQueryStatus::Completed),
                    group_id: None,
                    priority: Some(crate::models::TaskPriority::High),
                    date_range: None,
                    sort_by: Some(crate::models::TaskQuerySortBy::Default),
                    archive: Some(crate::models::TaskArchiveFilter::Active),
                }),
            },
        )
        .expect("export filtered tasks command");

        let exported = fs::read_to_string(&export_path).expect("read export");
        assert_eq!(result.export_path, export_path.to_string_lossy());
        assert!(exported.contains("completed task"));
        assert!(!exported.contains("active task"));
    }
}
