use super::{create_backup_file, init_database, restore_backup_file};
use rusqlite::{params, Connection};
use std::{fs, path::PathBuf};
use uuid::Uuid;

fn legacy_database_path() -> PathBuf {
    std::env::temp_dir().join(format!("qingdan-legacy-{}.db", Uuid::new_v4()))
}

#[test]
fn init_database_adds_priority_column_to_legacy_tasks_table() {
    let db_path = legacy_database_path();
    fs::create_dir_all(db_path.parent().expect("temp path has a parent"))
        .expect("create temp directory");

    {
        let connection = Connection::open(&db_path).expect("open legacy db");
        connection
            .execute_batch(
                "
                CREATE TABLE task_groups (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE tasks (
                    id TEXT PRIMARY KEY NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    completed INTEGER NOT NULL DEFAULT 0,
                    group_id TEXT NULL,
                    due_at TEXT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(group_id) REFERENCES task_groups(id) ON DELETE SET NULL
                );
                ",
            )
            .expect("seed legacy schema");
    }

    init_database(&db_path).expect("run database migration");

    let connection = Connection::open(&db_path).expect("reopen migrated db");
    connection
        .execute(
            "
            INSERT INTO tasks (
                id, title, description, completed, group_id, due_at, created_at, updated_at
            ) VALUES (?1, ?2, ?3, 0, NULL, NULL, ?4, ?5)
            ",
            params![
                Uuid::new_v4().to_string(),
                "legacy task",
                "legacy description",
                "2026-04-14T00:00:00.000Z",
                "2026-04-14T00:00:00.000Z"
            ],
        )
        .expect("insert task without explicit priority");

    let priority = connection
        .query_row(
            "SELECT priority FROM tasks WHERE title = ?1",
            params!["legacy task"],
            |row| row.get::<_, String>(0),
        )
        .expect("read migrated priority");

    assert_eq!(priority, "medium");
}

#[test]
fn init_database_adds_v040_task_columns_to_legacy_tasks_table() {
    let db_path = legacy_database_path();
    fs::create_dir_all(db_path.parent().expect("temp path has a parent"))
        .expect("create temp directory");

    {
        let connection = Connection::open(&db_path).expect("open legacy db");
        connection
            .execute_batch(
                "
                CREATE TABLE task_groups (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE tasks (
                    id TEXT PRIMARY KEY NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    completed INTEGER NOT NULL DEFAULT 0,
                    priority TEXT NOT NULL DEFAULT 'medium',
                    group_id TEXT NULL,
                    due_at TEXT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(group_id) REFERENCES task_groups(id) ON DELETE SET NULL
                );
                ",
            )
            .expect("seed legacy schema");
    }

    init_database(&db_path).expect("run database migration");

    let connection = Connection::open(&db_path).expect("reopen migrated db");
    let mut statement = connection
        .prepare("PRAGMA table_info(tasks)")
        .expect("read migrated schema");
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .expect("query task columns")
        .collect::<Result<Vec<_>, _>>()
        .expect("collect task columns");

    assert!(columns.iter().any(|column| column == "note"));
    assert!(columns.iter().any(|column| column == "completed_at"));
    assert!(columns.iter().any(|column| column == "archived_at"));
}

#[test]
fn init_database_backfills_completed_at_for_legacy_completed_tasks() {
    let db_path = legacy_database_path();
    fs::create_dir_all(db_path.parent().expect("temp path has a parent"))
        .expect("create temp directory");

    {
        let connection = Connection::open(&db_path).expect("open legacy db");
        connection
            .execute_batch(
                "
                CREATE TABLE task_groups (
                    id TEXT PRIMARY KEY NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE tasks (
                    id TEXT PRIMARY KEY NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    completed INTEGER NOT NULL DEFAULT 0,
                    priority TEXT NOT NULL DEFAULT 'medium',
                    group_id TEXT NULL,
                    due_at TEXT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    FOREIGN KEY(group_id) REFERENCES task_groups(id) ON DELETE SET NULL
                );
                ",
            )
            .expect("seed legacy schema");

        connection
            .execute(
                "
                INSERT INTO tasks (
                    id, title, description, completed, priority, group_id, due_at, created_at, updated_at
                ) VALUES (?1, 'legacy completed', '', 1, 'medium', NULL, NULL, ?2, ?3)
                ",
                params![
                    Uuid::new_v4().to_string(),
                    "2026-04-13T00:00:00Z",
                    "2026-04-14T08:00:00Z"
                ],
            )
            .expect("seed legacy completed task");
    }

    init_database(&db_path).expect("run database migration");

    let connection = Connection::open(&db_path).expect("reopen migrated db");
    let completed_at = connection
        .query_row(
            "SELECT completed_at FROM tasks WHERE title = 'legacy completed'",
            [],
            |row| row.get::<_, Option<String>>(0),
        )
        .expect("read migrated completed_at");

    assert_eq!(completed_at.as_deref(), Some("2026-04-14T08:00:00Z"));
}

#[test]
fn create_backup_copies_database_file() {
    let db_path = legacy_database_path();
    let backup_path = std::env::temp_dir().join(format!("qingdan-backup-{}.db", Uuid::new_v4()));
    fs::create_dir_all(db_path.parent().expect("temp path has a parent"))
        .expect("create temp directory");

    init_database(&db_path).expect("initialize database");

    let connection = Connection::open(&db_path).expect("open database");
    connection
        .execute(
            "
            INSERT INTO tasks (
                id, title, description, note, completed, completed_at, archived_at, priority,
                group_id, due_at, created_at, updated_at
            ) VALUES (?1, 'backup source', '', '', 0, NULL, NULL, 'medium', NULL, NULL, ?2, ?3)
            ",
            params![
                Uuid::new_v4().to_string(),
                "2026-04-25T00:00:00Z",
                "2026-04-25T00:00:00Z"
            ],
        )
        .expect("seed database");

    create_backup_file(&db_path, &backup_path).expect("create backup");

    let backup_connection = Connection::open(&backup_path).expect("open backup database");
    let title = backup_connection
        .query_row("SELECT title FROM tasks LIMIT 1", [], |row| row.get::<_, String>(0))
        .expect("read backup content");

    assert_eq!(title, "backup source");
}

#[test]
fn restore_backup_replaces_database_file_contents() {
    let db_path = legacy_database_path();
    let backup_path = std::env::temp_dir().join(format!("qingdan-restore-{}.db", Uuid::new_v4()));
    fs::create_dir_all(db_path.parent().expect("temp path has a parent"))
        .expect("create temp directory");

    init_database(&db_path).expect("initialize database");

    let connection = Connection::open(&db_path).expect("open database");
    connection
        .execute(
            "
            INSERT INTO tasks (
                id, title, description, note, completed, completed_at, archived_at, priority,
                group_id, due_at, created_at, updated_at
            ) VALUES (?1, 'before restore', '', '', 0, NULL, NULL, 'medium', NULL, NULL, ?2, ?3)
            ",
            params![
                Uuid::new_v4().to_string(),
                "2026-04-25T00:00:00Z",
                "2026-04-25T00:00:00Z"
            ],
        )
        .expect("seed live database");

    create_backup_file(&db_path, &backup_path).expect("create backup");

    connection
        .execute("DELETE FROM tasks", [])
        .expect("mutate live database");
    connection
        .execute(
            "
            INSERT INTO tasks (
                id, title, description, note, completed, completed_at, archived_at, priority,
                group_id, due_at, created_at, updated_at
            ) VALUES (?1, 'after mutation', '', '', 0, NULL, NULL, 'medium', NULL, NULL, ?2, ?3)
            ",
            params![
                Uuid::new_v4().to_string(),
                "2026-04-25T01:00:00Z",
                "2026-04-25T01:00:00Z"
            ],
        )
        .expect("seed mutated database");
    drop(connection);

    restore_backup_file(&db_path, &backup_path).expect("restore backup");

    let restored_connection = Connection::open(&db_path).expect("reopen restored database");
    let titles = restored_connection
        .prepare("SELECT title FROM tasks ORDER BY created_at ASC")
        .expect("prepare restored query")
        .query_map([], |row| row.get::<_, String>(0))
        .expect("query restored titles")
        .collect::<Result<Vec<_>, _>>()
        .expect("collect restored titles");

    assert_eq!(titles, vec!["before restore".to_string()]);
}
