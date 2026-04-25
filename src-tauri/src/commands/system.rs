//! 文件说明：系统级命令示例，用于验证前后端调用链已接通。

use std::path::PathBuf;

use tauri::State;

use crate::{
    db::{create_backup_file, restore_backup_file, DatabaseState},
    models::{BackupCommandResult, CreateBackupInput, RestoreBackupInput},
};

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

#[cfg(test)]
mod tests {
    use super::{create_backup_inner, restore_backup_inner};
    use crate::{
        db::{init_database, DatabaseState},
        models::{CreateBackupInput, RestoreBackupInput},
    };
    use rusqlite::{params, Connection};
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
}
