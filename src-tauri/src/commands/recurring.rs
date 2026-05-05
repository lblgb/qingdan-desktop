use rusqlite::params;
use tauri::State;
use time::{format_description::well_known::Rfc3339, Duration, OffsetDateTime};
use uuid::Uuid;

use crate::{
    db::{open_connection, DatabaseState},
    models::{
        CreateRecurringProgressEntryInput, CreateRecurringTaskInput, RecurringCadenceUnit,
        RecurringPeriod, RecurringProgressEntry, RecurringTask, UpdateRecurringProgressEntryInput,
        UpdateRecurringTaskInput,
    },
};

fn now() -> OffsetDateTime {
    OffsetDateTime::now_utc()
}

fn now_iso_string() -> Result<String, String> {
    now()
        .format(&Rfc3339)
        .map_err(|error| format!("generate recurring timestamp failed: {error}"))
}

fn parse_iso(value: &str) -> Result<OffsetDateTime, String> {
    OffsetDateTime::parse(value, &Rfc3339)
        .map_err(|error| format!("parse recurring timestamp failed: {error}"))
}

fn format_iso(value: OffsetDateTime) -> Result<String, String> {
    value
        .format(&Rfc3339)
        .map_err(|error| format!("format recurring timestamp failed: {error}"))
}

fn recurring_task_row_to_item(row: &rusqlite::Row<'_>) -> Result<RecurringTask, rusqlite::Error> {
    Ok(RecurringTask {
        id: row.get(0)?,
        title: row.get(1)?,
        description: row.get(2)?,
        cadence_unit: match row.get::<_, String>(3)?.as_str() {
            "minute" => RecurringCadenceUnit::Minute,
            "hour" => RecurringCadenceUnit::Hour,
            "week" => RecurringCadenceUnit::Week,
            _ => RecurringCadenceUnit::Day,
        },
        cadence_interval: row.get(4)?,
        remind_at_end: row.get::<_, i64>(5)? != 0,
        is_active: row.get::<_, i64>(6)? != 0,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn recurring_period_row_to_item(row: &rusqlite::Row<'_>) -> Result<RecurringPeriod, rusqlite::Error> {
    Ok(RecurringPeriod {
        id: row.get(0)?,
        task_id: row.get(1)?,
        start_at: row.get(2)?,
        end_at: row.get(3)?,
        closed_at: row.get(4)?,
        created_at: row.get(5)?,
        updated_at: row.get(6)?,
    })
}

fn recurring_progress_row_to_item(
    row: &rusqlite::Row<'_>,
) -> Result<RecurringProgressEntry, rusqlite::Error> {
    Ok(RecurringProgressEntry {
        id: row.get(0)?,
        period_id: row.get(1)?,
        content: row.get(2)?,
        created_at: row.get(3)?,
        updated_at: row.get(4)?,
    })
}

fn cadence_duration(unit: RecurringCadenceUnit, interval: i64) -> Result<Duration, String> {
    if interval <= 0 {
        return Err("recurring cadence interval must be positive".to_string());
    }

    match unit {
        RecurringCadenceUnit::Minute => Ok(Duration::minutes(interval)),
        RecurringCadenceUnit::Hour => Ok(Duration::hours(interval)),
        RecurringCadenceUnit::Day => Ok(Duration::days(interval)),
        RecurringCadenceUnit::Week => Ok(Duration::days(interval * 7)),
    }
}

fn insert_period(
    connection: &rusqlite::Connection,
    task_id: &str,
    start_at: OffsetDateTime,
    end_at: OffsetDateTime,
    timestamp: &str,
) -> Result<(), String> {
    connection
        .execute(
            "
            INSERT INTO recurring_periods (
                id, task_id, start_at, end_at, closed_at, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, NULL, ?5, ?6)
            ",
            params![
                Uuid::new_v4().to_string(),
                task_id,
                format_iso(start_at)?,
                format_iso(end_at)?,
                timestamp,
                timestamp
            ],
        )
        .map_err(|error| format!("insert recurring period failed: {error}"))?;

    Ok(())
}

fn ensure_current_periods_for_task(
    connection: &rusqlite::Connection,
    task: &RecurringTask,
    now_value: OffsetDateTime,
) -> Result<(), String> {
    if !task.is_active {
        return Ok(());
    }

    let duration = cadence_duration(task.cadence_unit, task.cadence_interval)?;
    let mut statement = connection
        .prepare(
            "
            SELECT id, task_id, start_at, end_at, closed_at, created_at, updated_at
            FROM recurring_periods
            WHERE task_id = ?1
            ORDER BY start_at DESC
            LIMIT 1
            ",
        )
        .map_err(|error| format!("prepare recurring period query failed: {error}"))?;

    let last_period = statement
        .query_row(params![task.id.as_str()], recurring_period_row_to_item)
        .ok();

    let timestamp = now_iso_string()?;

    match last_period {
        Some(period) => {
            let mut end_at = parse_iso(&period.end_at)?;

            while end_at <= now_value {
                let start_at = end_at;
                end_at = start_at + duration;
                insert_period(connection, &task.id, start_at, end_at, &timestamp)?;
            }
        }
        None => {
            let start_at = parse_iso(&task.created_at)?;
            let end_at = start_at + duration;
            insert_period(connection, &task.id, start_at, end_at, &timestamp)?;
        }
    }

    Ok(())
}

fn ensure_current_periods(state: &DatabaseState) -> Result<(), String> {
    let connection = open_connection(&state.db_path)?;
    let tasks = list_recurring_tasks_inner(state)?;
    let now_value = now();

    for task in &tasks {
        ensure_current_periods_for_task(&connection, task, now_value)?;
    }

    Ok(())
}

pub(crate) fn list_recurring_tasks_inner(state: &DatabaseState) -> Result<Vec<RecurringTask>, String> {
    let connection = open_connection(&state.db_path)?;
    let mut statement = connection
        .prepare(
            "
            SELECT id, title, description, cadence_unit, cadence_interval, remind_at_end,
                   is_active, created_at, updated_at
            FROM recurring_tasks
            ORDER BY updated_at DESC, created_at DESC
            ",
        )
        .map_err(|error| format!("prepare recurring task list failed: {error}"))?;

    let rows = statement
        .query_map([], recurring_task_row_to_item)
        .map_err(|error| format!("query recurring task list failed: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("read recurring task list failed: {error}"))
}

pub(crate) fn list_recurring_periods_inner(
    state: &DatabaseState,
    task_id: &str,
) -> Result<Vec<RecurringPeriod>, String> {
    ensure_current_periods(state)?;

    let connection = open_connection(&state.db_path)?;
    let mut statement = connection
        .prepare(
            "
            SELECT id, task_id, start_at, end_at, closed_at, created_at, updated_at
            FROM recurring_periods
            WHERE task_id = ?1
            ORDER BY start_at DESC
            ",
        )
        .map_err(|error| format!("prepare recurring period list failed: {error}"))?;

    let rows = statement
        .query_map(params![task_id], recurring_period_row_to_item)
        .map_err(|error| format!("query recurring period list failed: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("read recurring period list failed: {error}"))
}

pub(crate) fn list_recurring_progress_entries_inner(
    state: &DatabaseState,
    period_id: &str,
) -> Result<Vec<RecurringProgressEntry>, String> {
    let connection = open_connection(&state.db_path)?;
    let mut statement = connection
        .prepare(
            "
            SELECT id, period_id, content, created_at, updated_at
            FROM recurring_progress_entries
            WHERE period_id = ?1
            ORDER BY created_at DESC, updated_at DESC
            ",
        )
        .map_err(|error| format!("prepare recurring progress list failed: {error}"))?;

    let rows = statement
        .query_map(params![period_id], recurring_progress_row_to_item)
        .map_err(|error| format!("query recurring progress list failed: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("read recurring progress list failed: {error}"))
}

pub(crate) fn create_recurring_task_inner(
    state: &DatabaseState,
    input: &CreateRecurringTaskInput,
) -> Result<Vec<RecurringTask>, String> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err("recurring task title cannot be empty".to_string());
    }
    if input.cadence_interval <= 0 {
        return Err("recurring cadence interval must be positive".to_string());
    }

    let connection = open_connection(&state.db_path)?;
    let timestamp = now_iso_string()?;
    let task_id = Uuid::new_v4().to_string();

    connection
        .execute(
            "
            INSERT INTO recurring_tasks (
                id, title, description, cadence_unit, cadence_interval, remind_at_end,
                is_active, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8)
            ",
            params![
                task_id,
                title,
                input.description.trim(),
                match input.cadence_unit {
                    RecurringCadenceUnit::Minute => "minute",
                    RecurringCadenceUnit::Hour => "hour",
                    RecurringCadenceUnit::Day => "day",
                    RecurringCadenceUnit::Week => "week",
                },
                input.cadence_interval,
                if input.remind_at_end { 1 } else { 0 },
                timestamp,
                timestamp
            ],
        )
        .map_err(|error| format!("create recurring task failed: {error}"))?;

    let start_at = parse_iso(&timestamp)?;
    let end_at = start_at + cadence_duration(input.cadence_unit, input.cadence_interval)?;
    insert_period(&connection, &task_id, start_at, end_at, &timestamp)?;

    list_recurring_tasks_inner(state)
}

pub(crate) fn update_recurring_task_inner(
    state: &DatabaseState,
    input: &UpdateRecurringTaskInput,
) -> Result<Vec<RecurringTask>, String> {
    let title = input.title.trim();
    if title.is_empty() {
        return Err("recurring task title cannot be empty".to_string());
    }
    if input.cadence_interval <= 0 {
        return Err("recurring cadence interval must be positive".to_string());
    }

    let connection = open_connection(&state.db_path)?;
    connection
        .execute(
            "
            UPDATE recurring_tasks
            SET title = ?2,
                description = ?3,
                cadence_unit = ?4,
                cadence_interval = ?5,
                remind_at_end = ?6,
                is_active = ?7,
                updated_at = ?8
            WHERE id = ?1
            ",
            params![
                input.id,
                title,
                input.description.trim(),
                match input.cadence_unit {
                    RecurringCadenceUnit::Minute => "minute",
                    RecurringCadenceUnit::Hour => "hour",
                    RecurringCadenceUnit::Day => "day",
                    RecurringCadenceUnit::Week => "week",
                },
                input.cadence_interval,
                if input.remind_at_end { 1 } else { 0 },
                if input.is_active { 1 } else { 0 },
                now_iso_string()?
            ],
        )
        .map_err(|error| format!("update recurring task failed: {error}"))?;

    list_recurring_tasks_inner(state)
}

pub(crate) fn delete_recurring_task_inner(
    state: &DatabaseState,
    task_id: &str,
) -> Result<Vec<RecurringTask>, String> {
    let mut connection = open_connection(&state.db_path)?;
    let transaction = connection
        .transaction()
        .map_err(|error| format!("start recurring task delete transaction failed: {error}"))?;

    transaction
        .execute(
            "
            DELETE FROM recurring_progress_entries
            WHERE period_id IN (
                SELECT id FROM recurring_periods WHERE task_id = ?1
            )
            ",
            params![task_id],
        )
        .map_err(|error| format!("delete recurring progress entries failed: {error}"))?;

    transaction
        .execute("DELETE FROM recurring_periods WHERE task_id = ?1", params![task_id])
        .map_err(|error| format!("delete recurring periods failed: {error}"))?;

    transaction
        .execute("DELETE FROM recurring_tasks WHERE id = ?1", params![task_id])
        .map_err(|error| format!("delete recurring task failed: {error}"))?;

    transaction
        .commit()
        .map_err(|error| format!("commit recurring task delete transaction failed: {error}"))?;

    list_recurring_tasks_inner(state)
}

pub(crate) fn create_recurring_progress_entry_inner(
    state: &DatabaseState,
    input: &CreateRecurringProgressEntryInput,
) -> Result<Vec<RecurringProgressEntry>, String> {
    let content = input.content.trim();
    if content.is_empty() {
        return Err("recurring progress content cannot be empty".to_string());
    }

    let connection = open_connection(&state.db_path)?;
    let timestamp = now_iso_string()?;
    connection
        .execute(
            "
            INSERT INTO recurring_progress_entries (
                id, period_id, content, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5)
            ",
            params![
                Uuid::new_v4().to_string(),
                input.period_id,
                content,
                timestamp,
                timestamp
            ],
        )
        .map_err(|error| format!("create recurring progress entry failed: {error}"))?;

    list_recurring_progress_entries_inner(state, &input.period_id)
}

pub(crate) fn update_recurring_progress_entry_inner(
    state: &DatabaseState,
    input: &UpdateRecurringProgressEntryInput,
) -> Result<Vec<RecurringProgressEntry>, String> {
    let content = input.content.trim();
    if content.is_empty() {
        return Err("recurring progress content cannot be empty".to_string());
    }

    let connection = open_connection(&state.db_path)?;
    let period_id = connection
        .query_row(
            "SELECT period_id FROM recurring_progress_entries WHERE id = ?1",
            params![input.id.as_str()],
            |row| row.get::<_, String>(0),
        )
        .map_err(|error| format!("load recurring progress entry failed: {error}"))?;

    connection
        .execute(
            "
            UPDATE recurring_progress_entries
            SET content = ?2,
                updated_at = ?3
            WHERE id = ?1
            ",
            params![input.id, content, now_iso_string()?],
        )
        .map_err(|error| format!("update recurring progress entry failed: {error}"))?;

    list_recurring_progress_entries_inner(state, &period_id)
}

#[tauri::command]
pub fn list_recurring_tasks(state: State<'_, DatabaseState>) -> Result<Vec<RecurringTask>, String> {
    list_recurring_tasks_inner(&state)
}

#[tauri::command]
pub fn list_recurring_periods(
    task_id: String,
    state: State<'_, DatabaseState>,
) -> Result<Vec<RecurringPeriod>, String> {
    list_recurring_periods_inner(&state, &task_id)
}

#[tauri::command]
pub fn list_recurring_progress_entries(
    period_id: String,
    state: State<'_, DatabaseState>,
) -> Result<Vec<RecurringProgressEntry>, String> {
    list_recurring_progress_entries_inner(&state, &period_id)
}

#[tauri::command]
pub fn create_recurring_task(
    input: CreateRecurringTaskInput,
    state: State<'_, DatabaseState>,
) -> Result<Vec<RecurringTask>, String> {
    create_recurring_task_inner(&state, &input)
}

#[tauri::command]
pub fn update_recurring_task(
    input: UpdateRecurringTaskInput,
    state: State<'_, DatabaseState>,
) -> Result<Vec<RecurringTask>, String> {
    update_recurring_task_inner(&state, &input)
}

#[tauri::command]
pub fn delete_recurring_task(
    task_id: String,
    state: State<'_, DatabaseState>,
) -> Result<Vec<RecurringTask>, String> {
    delete_recurring_task_inner(&state, &task_id)
}

#[tauri::command]
pub fn create_recurring_progress_entry(
    input: CreateRecurringProgressEntryInput,
    state: State<'_, DatabaseState>,
) -> Result<Vec<RecurringProgressEntry>, String> {
    create_recurring_progress_entry_inner(&state, &input)
}

#[tauri::command]
pub fn update_recurring_progress_entry(
    input: UpdateRecurringProgressEntryInput,
    state: State<'_, DatabaseState>,
) -> Result<Vec<RecurringProgressEntry>, String> {
    update_recurring_progress_entry_inner(&state, &input)
}

#[cfg(test)]
mod tests {
    use super::{
        create_recurring_progress_entry_inner, create_recurring_task_inner,
        delete_recurring_task_inner, list_recurring_periods_inner, list_recurring_progress_entries_inner,
        update_recurring_progress_entry_inner,
    };
    use crate::{
        db::{init_database, DatabaseState},
        models::{
            CreateRecurringProgressEntryInput, CreateRecurringTaskInput, RecurringCadenceUnit,
            UpdateRecurringProgressEntryInput,
        },
    };
    use std::fs;
    use uuid::Uuid;

    fn temp_db_path() -> std::path::PathBuf {
        std::env::temp_dir().join(format!("qingdan-recurring-command-{}.db", Uuid::new_v4()))
    }

    #[test]
    fn create_recurring_task_creates_initial_period() {
        let db_path = temp_db_path();
        fs::remove_file(&db_path).ok();
        init_database(&db_path).expect("initialize database");

        let state = DatabaseState { db_path };
        let tasks = create_recurring_task_inner(
            &state,
            &CreateRecurringTaskInput {
                title: "Weekly report".to_string(),
                description: "submit progress".to_string(),
                cadence_unit: RecurringCadenceUnit::Week,
                cadence_interval: 1,
                remind_at_end: true,
            },
        )
        .expect("create recurring task");

        assert_eq!(tasks.len(), 1);
        let periods = list_recurring_periods_inner(&state, &tasks[0].id).expect("list recurring periods");
        assert_eq!(periods.len(), 1);
        assert!(periods[0].end_at > periods[0].start_at);
    }

    #[test]
    fn create_recurring_progress_entry_marks_period_as_submitted_by_existence() {
        let db_path = temp_db_path();
        fs::remove_file(&db_path).ok();
        init_database(&db_path).expect("initialize database");

        let state = DatabaseState { db_path };
        let tasks = create_recurring_task_inner(
            &state,
            &CreateRecurringTaskInput {
                title: "Daily sync".to_string(),
                description: "".to_string(),
                cadence_unit: RecurringCadenceUnit::Day,
                cadence_interval: 1,
                remind_at_end: true,
            },
        )
        .expect("create recurring task");
        let periods = list_recurring_periods_inner(&state, &tasks[0].id).expect("list recurring periods");

        let entries = create_recurring_progress_entry_inner(
            &state,
            &CreateRecurringProgressEntryInput {
                period_id: periods[0].id.clone(),
                content: "finished the main blocker".to_string(),
            },
        )
        .expect("create recurring progress entry");

        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].period_id, periods[0].id);
    }

    #[test]
    fn update_recurring_progress_entry_persists_edited_content() {
        let db_path = temp_db_path();
        fs::remove_file(&db_path).ok();
        init_database(&db_path).expect("initialize database");

        let state = DatabaseState { db_path };
        let tasks = create_recurring_task_inner(
            &state,
            &CreateRecurringTaskInput {
                title: "Three day review".to_string(),
                description: "".to_string(),
                cadence_unit: RecurringCadenceUnit::Day,
                cadence_interval: 3,
                remind_at_end: false,
            },
        )
        .expect("create recurring task");
        let periods = list_recurring_periods_inner(&state, &tasks[0].id).expect("list recurring periods");
        let entries = create_recurring_progress_entry_inner(
            &state,
            &CreateRecurringProgressEntryInput {
                period_id: periods[0].id.clone(),
                content: "first draft".to_string(),
            },
        )
        .expect("create recurring progress entry");

        let updated_entries = update_recurring_progress_entry_inner(
            &state,
            &UpdateRecurringProgressEntryInput {
                id: entries[0].id.clone(),
                content: "second draft".to_string(),
            },
        )
        .expect("update recurring progress entry");

        assert_eq!(updated_entries[0].content, "second draft");

        let loaded_entries =
            list_recurring_progress_entries_inner(&state, &periods[0].id).expect("reload recurring progress entries");
        assert_eq!(loaded_entries[0].content, "second draft");
    }

    #[test]
    fn delete_recurring_task_removes_periods_and_progress_entries() {
        let db_path = temp_db_path();
        fs::remove_file(&db_path).ok();
        init_database(&db_path).expect("initialize database");

        let state = DatabaseState { db_path };
        let tasks = create_recurring_task_inner(
            &state,
            &CreateRecurringTaskInput {
                title: "Weekly report".to_string(),
                description: "".to_string(),
                cadence_unit: RecurringCadenceUnit::Week,
                cadence_interval: 1,
                remind_at_end: true,
            },
        )
        .expect("create recurring task");
        let periods = list_recurring_periods_inner(&state, &tasks[0].id).expect("list recurring periods");
        create_recurring_progress_entry_inner(
            &state,
            &CreateRecurringProgressEntryInput {
                period_id: periods[0].id.clone(),
                content: "done".to_string(),
            },
        )
        .expect("create progress");

        let next_tasks = delete_recurring_task_inner(&state, &tasks[0].id).expect("delete recurring task");

        assert!(next_tasks.is_empty());
        assert!(list_recurring_periods_inner(&state, &tasks[0].id).expect("reload periods").is_empty());
        assert!(list_recurring_progress_entries_inner(&state, &periods[0].id)
            .expect("reload entries")
            .is_empty());
    }
}
