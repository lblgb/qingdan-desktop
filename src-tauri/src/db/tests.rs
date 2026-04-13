use super::init_database;
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
