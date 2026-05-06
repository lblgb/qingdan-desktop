# v1.0 Recurring Time Driven Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert recurring tasks from text progress submission into minute-based time tracking with per-period targets, timer sessions, time-entry history, and current-period overview reporting.

**Architecture:** Keep recurring tasks as an independent subsystem. Replace the new user-facing progress-entry flow with `RecurringTimeEntry` while preserving legacy progress entries as migrated 0-minute historical notes. Backend owns durable recurring task, period, and time-entry records; frontend owns active timer session state and writes a time entry only when the user ends and saves a session.

**Tech Stack:** Tauri 2, Rust, rusqlite, React, TypeScript, Zustand, Vitest, CSS.

---

## File Map

- Modify `src-tauri/src/models/mod.rs`: add target-minute and time-entry models and command input structs.
- Modify `src-tauri/src/db/mod.rs`: add recurring time-entry table, target-minute migration, old-progress migration.
- Modify `src-tauri/src/db/tests.rs`: cover recurring schema migration and legacy progress migration.
- Modify `src-tauri/src/commands/recurring.rs`: return target minutes, create/list/update/delete time entries, preserve current-period generation.
- Modify `src-tauri/src/lib.rs`: register new time-entry commands.
- Modify `src/features/recurring/recurring.types.ts`: replace progress-entry types with time-entry types and add timer-session type.
- Modify `src/features/recurring/recurring.storage.ts`: add local fallback storage and Tauri invoke wrappers for time entries.
- Modify `src/stores/recurringStore.ts`: rename entry state to time entries, add create/update/delete methods.
- Modify `src/features/recurring/recurring.overview.ts`: compute target, completed, remaining, rates, and per-task current-period snapshots.
- Modify `src/features/recurring/recurring.reminders.ts`: use time-entry duration instead of progress-entry count for completion state.
- Modify `src/components/TaskComposer.tsx`: add required target minutes when creating recurring tasks.
- Modify `src/components/RecurringTaskList.tsx`: replace submit-progress UI with timer modal, current-period progress cards, detail history, and edit/delete time entries.
- Modify `src/components/TaskOverview.tsx`: replace recurring summary with time-driven current-period overview and task晒 cards.
- Modify `src/index.css`: add timer, time-entry, and overview styles consistent with current console theme.
- Update tests under `src/features/recurring`, `src/stores`, and `src/components`.
- Update docs `docs/ARCHITECTURE.md`, `docs/PROJECT_CONSTRAINTS.md`, `docs/WORKLOG.md`, and add `docs/V100_ACCEPTANCE.md` during release preparation.

---

### Task 1: Backend Schema And Model Upgrade

**Files:**
- Modify: `src-tauri/src/models/mod.rs`
- Modify: `src-tauri/src/db/mod.rs`
- Modify: `src-tauri/src/db/tests.rs`

- [ ] **Step 1: Add failing database migration tests**

Add tests to `src-tauri/src/db/tests.rs` near the existing recurring database tests:

```rust
#[test]
fn init_database_adds_recurring_target_minutes_to_legacy_tasks() {
    let db_path = temp_db_path();
    {
        let connection = rusqlite::Connection::open(&db_path).expect("open test db");
        connection
            .execute_batch(
                "
                CREATE TABLE recurring_tasks (
                    id TEXT PRIMARY KEY NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    cadence_unit TEXT NOT NULL,
                    cadence_interval INTEGER NOT NULL,
                    remind_at_end INTEGER NOT NULL DEFAULT 1,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                ",
            )
            .expect("create legacy recurring_tasks");
    }

    init_database(&db_path).expect("migrate database");
    let connection = rusqlite::Connection::open(&db_path).expect("reopen db");
    let columns = table_columns(&connection, "recurring_tasks");

    assert!(columns.contains(&"target_minutes_per_period".to_string()));
}

#[test]
fn init_database_migrates_legacy_progress_entries_to_zero_minute_time_entries() {
    let db_path = temp_db_path();
    {
        let connection = rusqlite::Connection::open(&db_path).expect("open test db");
        connection
            .execute_batch(
                "
                CREATE TABLE recurring_tasks (
                    id TEXT PRIMARY KEY NOT NULL,
                    title TEXT NOT NULL,
                    description TEXT NOT NULL,
                    cadence_unit TEXT NOT NULL,
                    cadence_interval INTEGER NOT NULL,
                    remind_at_end INTEGER NOT NULL DEFAULT 1,
                    is_active INTEGER NOT NULL DEFAULT 1,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE recurring_periods (
                    id TEXT PRIMARY KEY NOT NULL,
                    task_id TEXT NOT NULL,
                    start_at TEXT NOT NULL,
                    end_at TEXT NOT NULL,
                    closed_at TEXT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE TABLE recurring_progress_entries (
                    id TEXT PRIMARY KEY NOT NULL,
                    period_id TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                INSERT INTO recurring_tasks VALUES ('task-1', 'Workout', '', 'week', 1, 1, 1, '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');
                INSERT INTO recurring_periods VALUES ('period-1', 'task-1', '2026-05-01T00:00:00Z', '2026-05-08T00:00:00Z', NULL, '2026-05-01T00:00:00Z', '2026-05-01T00:00:00Z');
                INSERT INTO recurring_progress_entries VALUES ('entry-1', 'period-1', 'legacy note', '2026-05-02T00:00:00Z', '2026-05-02T01:00:00Z');
                ",
            )
            .expect("create legacy progress data");
    }

    init_database(&db_path).expect("migrate database");
    let connection = rusqlite::Connection::open(&db_path).expect("reopen db");
    let row = connection
        .query_row(
            "SELECT period_id, duration_minutes, note FROM recurring_time_entries WHERE id = 'entry-1'",
            [],
            |row| Ok((row.get::<_, String>(0)?, row.get::<_, i64>(1)?, row.get::<_, String>(2)?)),
        )
        .expect("read migrated time entry");

    assert_eq!(row, ("period-1".to_string(), 0, "legacy note".to_string()));
}
```

- [ ] **Step 2: Run failing backend tests**

Run:

```powershell
cargo test init_database_adds_recurring_target_minutes_to_legacy_tasks init_database_migrates_legacy_progress_entries_to_zero_minute_time_entries
```

Expected: fail because `target_minutes_per_period`, `recurring_time_entries`, and `table_columns` helper usage are not yet present.

- [ ] **Step 3: Add Rust models**

In `src-tauri/src/models/mod.rs`, update recurring structs:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecurringTask {
    pub id: String,
    pub title: String,
    pub description: String,
    pub cadence_unit: RecurringCadenceUnit,
    pub cadence_interval: i64,
    pub target_minutes_per_period: i64,
    pub remind_at_end: bool,
    pub is_active: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecurringTimeEntry {
    pub id: String,
    pub period_id: String,
    pub started_at: String,
    pub ended_at: String,
    pub duration_minutes: i64,
    pub note: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRecurringTaskInput {
    pub title: String,
    pub description: String,
    pub cadence_unit: RecurringCadenceUnit,
    pub cadence_interval: i64,
    pub target_minutes_per_period: i64,
    pub remind_at_end: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRecurringTaskInput {
    pub id: String,
    pub title: String,
    pub description: String,
    pub cadence_unit: RecurringCadenceUnit,
    pub cadence_interval: i64,
    pub target_minutes_per_period: i64,
    pub remind_at_end: bool,
    pub is_active: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRecurringTimeEntryInput {
    pub period_id: String,
    pub started_at: String,
    pub ended_at: String,
    pub duration_minutes: i64,
    pub note: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRecurringTimeEntryNoteInput {
    pub id: String,
    pub note: String,
}
```

Keep old `RecurringProgressEntry` input structs only until command replacement is complete; remove them in Task 2 after compilation is restored.

- [ ] **Step 4: Implement database migration helpers**

In `src-tauri/src/db/mod.rs`, update both recurring table creation blocks and `ensure_recurring_tables` to include:

```sql
target_minutes_per_period INTEGER NOT NULL DEFAULT 420
```

Add `recurring_time_entries`:

```sql
CREATE TABLE IF NOT EXISTS recurring_time_entries (
    id TEXT PRIMARY KEY NOT NULL,
    period_id TEXT NOT NULL,
    started_at TEXT NOT NULL,
    ended_at TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(period_id) REFERENCES recurring_periods(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recurring_time_entries_period_id_started_at
ON recurring_time_entries(period_id, started_at DESC);
```

Add helper functions:

```rust
fn table_has_column(connection: &Connection, table_name: &str, column_name: &str) -> Result<bool, String> {
    let mut statement = connection
        .prepare(&format!("PRAGMA table_info({table_name})"))
        .map_err(|error| format!("read {table_name} columns failed: {error}"))?;
    let columns = statement
        .query_map([], |row| row.get::<_, String>(1))
        .map_err(|error| format!("query {table_name} columns failed: {error}"))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("collect {table_name} columns failed: {error}"))?;

    Ok(columns.iter().any(|column| column == column_name))
}

fn ensure_recurring_target_minutes_column(connection: &Connection) -> Result<(), String> {
    if !table_has_column(connection, "recurring_tasks", "target_minutes_per_period")? {
        connection
            .execute(
                "ALTER TABLE recurring_tasks ADD COLUMN target_minutes_per_period INTEGER NOT NULL DEFAULT 420",
                [],
            )
            .map_err(|error| format!("add recurring target minutes column failed: {error}"))?;
    }

    Ok(())
}

fn migrate_recurring_progress_entries(connection: &Connection) -> Result<(), String> {
    connection
        .execute(
            "
            INSERT OR IGNORE INTO recurring_time_entries (
                id, period_id, started_at, ended_at, duration_minutes, note, created_at, updated_at
            )
            SELECT id, period_id, created_at, created_at, 0, content, created_at, updated_at
            FROM recurring_progress_entries
            ",
            [],
        )
        .map_err(|error| format!("migrate recurring progress entries failed: {error}"))?;

    Ok(())
}
```

Call `ensure_recurring_target_minutes_column(connection)?;` and `migrate_recurring_progress_entries(connection)?;` at the end of `ensure_recurring_tables`.

- [ ] **Step 5: Run backend migration tests**

Run:

```powershell
cargo test init_database_adds_recurring_target_minutes_to_legacy_tasks init_database_migrates_legacy_progress_entries_to_zero_minute_time_entries
```

Expected: both tests pass.

- [ ] **Step 6: Commit backend schema**

```powershell
git add src-tauri/src/models/mod.rs src-tauri/src/db/mod.rs src-tauri/src/db/tests.rs
git commit -m "feat: add recurring time entry schema"
```

---

### Task 2: Backend Time Entry Commands

**Files:**
- Modify: `src-tauri/src/commands/recurring.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/models/mod.rs`

- [ ] **Step 1: Write failing command tests**

In `src-tauri/src/commands/recurring.rs`, replace progress command tests with time-entry tests:

```rust
#[test]
fn create_recurring_time_entry_persists_minutes_and_note() {
    let state = test_state();
    let tasks = create_recurring_task_inner(
        &state,
        &CreateRecurringTaskInput {
            title: "Practice".to_string(),
            description: "".to_string(),
            cadence_unit: RecurringCadenceUnit::Week,
            cadence_interval: 1,
            target_minutes_per_period: 420,
            remind_at_end: true,
        },
    )
    .expect("create task");
    let periods = list_recurring_periods_inner(&state, &tasks[0].id).expect("list periods");

    let entries = create_recurring_time_entry_inner(
        &state,
        &CreateRecurringTimeEntryInput {
            period_id: periods[0].id.clone(),
            started_at: "2026-05-06T12:00:00Z".to_string(),
            ended_at: "2026-05-06T13:35:00Z".to_string(),
            duration_minutes: 95,
            note: "implemented timer".to_string(),
        },
    )
    .expect("create time entry");

    assert_eq!(entries.len(), 1);
    assert_eq!(entries[0].duration_minutes, 95);
    assert_eq!(entries[0].note, "implemented timer");
}

#[test]
fn update_recurring_time_entry_note_only_changes_note() {
    let state = test_state();
    let tasks = create_recurring_task_inner(
        &state,
        &CreateRecurringTaskInput {
            title: "Practice".to_string(),
            description: "".to_string(),
            cadence_unit: RecurringCadenceUnit::Day,
            cadence_interval: 1,
            target_minutes_per_period: 60,
            remind_at_end: true,
        },
    )
    .expect("create task");
    let periods = list_recurring_periods_inner(&state, &tasks[0].id).expect("list periods");
    let entries = create_recurring_time_entry_inner(
        &state,
        &CreateRecurringTimeEntryInput {
            period_id: periods[0].id.clone(),
            started_at: "2026-05-06T12:00:00Z".to_string(),
            ended_at: "2026-05-06T12:20:00Z".to_string(),
            duration_minutes: 20,
            note: "draft".to_string(),
        },
    )
    .expect("create entry");

    let updated = update_recurring_time_entry_note_inner(
        &state,
        &UpdateRecurringTimeEntryNoteInput {
            id: entries[0].id.clone(),
            note: "revised note".to_string(),
        },
    )
    .expect("update note");

    assert_eq!(updated[0].duration_minutes, 20);
    assert_eq!(updated[0].note, "revised note");
}
```

- [ ] **Step 2: Run failing command tests**

Run:

```powershell
cargo test recurring_time_entry
```

Expected: fail because command functions are not implemented.

- [ ] **Step 3: Replace row mappers and query functions**

In `src-tauri/src/commands/recurring.rs`, add:

```rust
fn recurring_time_entry_row_to_item(row: &rusqlite::Row<'_>) -> Result<RecurringTimeEntry, rusqlite::Error> {
    Ok(RecurringTimeEntry {
        id: row.get(0)?,
        period_id: row.get(1)?,
        started_at: row.get(2)?,
        ended_at: row.get(3)?,
        duration_minutes: row.get(4)?,
        note: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}
```

Update recurring task SQL select and insert/update to include `target_minutes_per_period`.

Add:

```rust
pub(crate) fn list_recurring_time_entries_inner(
    state: &DatabaseState,
    period_id: &str,
) -> Result<Vec<RecurringTimeEntry>, String> {
    let connection = open_connection(&state.db_path)?;
    let mut statement = connection
        .prepare(
            "
            SELECT id, period_id, started_at, ended_at, duration_minutes, note, created_at, updated_at
            FROM recurring_time_entries
            WHERE period_id = ?1
            ORDER BY started_at DESC, created_at DESC
            ",
        )
        .map_err(|error| format!("prepare recurring time entry list failed: {error}"))?;

    let rows = statement
        .query_map(params![period_id], recurring_time_entry_row_to_item)
        .map_err(|error| format!("query recurring time entry list failed: {error}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|error| format!("read recurring time entry list failed: {error}"))
}
```

- [ ] **Step 4: Implement create/update/delete commands**

Add validation and command functions:

```rust
pub(crate) fn create_recurring_time_entry_inner(
    state: &DatabaseState,
    input: &CreateRecurringTimeEntryInput,
) -> Result<Vec<RecurringTimeEntry>, String> {
    if input.duration_minutes < 1 {
        return Err("recurring time entry duration must be at least 1 minute".to_string());
    }
    if parse_iso(&input.started_at)? > parse_iso(&input.ended_at)? {
        return Err("recurring time entry start cannot be after end".to_string());
    }

    let connection = open_connection(&state.db_path)?;
    let timestamp = now_iso_string()?;
    connection
        .execute(
            "
            INSERT INTO recurring_time_entries (
                id, period_id, started_at, ended_at, duration_minutes, note, created_at, updated_at
            ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
            ",
            params![
                Uuid::new_v4().to_string(),
                input.period_id,
                input.started_at,
                input.ended_at,
                input.duration_minutes,
                input.note.trim(),
                timestamp,
                timestamp
            ],
        )
        .map_err(|error| format!("create recurring time entry failed: {error}"))?;

    list_recurring_time_entries_inner(state, &input.period_id)
}

pub(crate) fn update_recurring_time_entry_note_inner(
    state: &DatabaseState,
    input: &UpdateRecurringTimeEntryNoteInput,
) -> Result<Vec<RecurringTimeEntry>, String> {
    let connection = open_connection(&state.db_path)?;
    let period_id = connection
        .query_row(
            "SELECT period_id FROM recurring_time_entries WHERE id = ?1",
            params![input.id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|error| format!("load recurring time entry failed: {error}"))?;
    let timestamp = now_iso_string()?;

    connection
        .execute(
            "UPDATE recurring_time_entries SET note = ?1, updated_at = ?2 WHERE id = ?3",
            params![input.note.trim(), timestamp, input.id],
        )
        .map_err(|error| format!("update recurring time entry note failed: {error}"))?;

    list_recurring_time_entries_inner(state, &period_id)
}

pub(crate) fn delete_recurring_time_entry_inner(
    state: &DatabaseState,
    entry_id: &str,
) -> Result<Vec<RecurringTimeEntry>, String> {
    let connection = open_connection(&state.db_path)?;
    let period_id = connection
        .query_row(
            "SELECT period_id FROM recurring_time_entries WHERE id = ?1",
            params![entry_id],
            |row| row.get::<_, String>(0),
        )
        .map_err(|error| format!("load recurring time entry failed: {error}"))?;

    connection
        .execute("DELETE FROM recurring_time_entries WHERE id = ?1", params![entry_id])
        .map_err(|error| format!("delete recurring time entry failed: {error}"))?;

    list_recurring_time_entries_inner(state, &period_id)
}
```

Expose Tauri command wrappers and register them in `src-tauri/src/lib.rs`.

- [ ] **Step 5: Remove old progress command registration**

Remove progress command imports, wrappers, and registrations:

```rust
create_recurring_progress_entry
update_recurring_progress_entry
list_recurring_progress_entries
```

Keep the legacy table and migration in `db/mod.rs`; only remove the new user-facing command surface.

- [ ] **Step 6: Run backend tests**

Run:

```powershell
cargo test recurring
```

Expected: recurring command and database tests pass.

- [ ] **Step 7: Commit backend commands**

```powershell
git add src-tauri/src/commands/recurring.rs src-tauri/src/lib.rs src-tauri/src/models/mod.rs
git commit -m "feat: add recurring time entry commands"
```

---

### Task 3: Frontend Types, Storage, Store, And Calculations

**Files:**
- Modify: `src/features/recurring/recurring.types.ts`
- Modify: `src/features/recurring/recurring.storage.ts`
- Modify: `src/stores/recurringStore.ts`
- Modify: `src/features/recurring/recurring.overview.ts`
- Modify: `src/features/recurring/recurring.reminders.ts`
- Modify tests in `src/features/recurring` and `src/stores/recurringStore.test.ts`

- [ ] **Step 1: Write failing TypeScript unit tests**

Update `src/features/recurring/recurring.overview.test.ts`:

```ts
it('summarizes current-period target and completed minutes for recurring tasks', () => {
  const task: RecurringTask = {
    id: 'task-1',
    title: 'Study',
    description: '',
    cadenceUnit: 'week',
    cadenceInterval: 1,
    targetMinutesPerPeriod: 420,
    remindAtEnd: true,
    isActive: true,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  }
  const period: RecurringPeriod = {
    id: 'period-1',
    taskId: 'task-1',
    startAt: '2026-05-01T00:00:00.000Z',
    endAt: '2026-05-08T00:00:00.000Z',
    closedAt: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  }

  const snapshot = buildRecurringOverview(
    [task],
    { 'task-1': [period] },
    {
      'period-1': [
        {
          id: 'entry-1',
          periodId: 'period-1',
          startedAt: '2026-05-02T08:00:00.000Z',
          endedAt: '2026-05-02T09:30:00.000Z',
          durationMinutes: 90,
          note: 'read docs',
          createdAt: '2026-05-02T09:30:00.000Z',
          updatedAt: '2026-05-02T09:30:00.000Z',
        },
      ],
    },
    '2026-05-02T10:00:00.000Z',
  )

  expect(snapshot.totalTargetMinutes).toBe(420)
  expect(snapshot.totalCompletedMinutes).toBe(90)
  expect(snapshot.totalRemainingMinutes).toBe(330)
  expect(snapshot.items[0].completionRate).toBe(21)
  expect(snapshot.items[0].latestEntry?.note).toBe('read docs')
})
```

- [ ] **Step 2: Run failing frontend tests**

Run:

```powershell
npm.cmd test -- recurring.overview recurring.storage recurringStore
```

Expected: fail because time-entry types and methods are not present.

- [ ] **Step 3: Update TypeScript types**

In `src/features/recurring/recurring.types.ts`, use:

```ts
export interface RecurringTask {
  id: string
  title: string
  description: string
  cadenceUnit: RecurringCadenceUnit
  cadenceInterval: number
  targetMinutesPerPeriod: number
  remindAtEnd: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface RecurringTimeEntry {
  id: string
  periodId: string
  startedAt: string
  endedAt: string
  durationMinutes: number
  note: string
  createdAt: string
  updatedAt: string
}

export interface CreateRecurringTaskInput {
  title: string
  description: string
  cadenceUnit: RecurringCadenceUnit
  cadenceInterval: number
  targetMinutesPerPeriod: number
  remindAtEnd: boolean
}

export interface CreateRecurringTimeEntryInput {
  periodId: string
  startedAt: string
  endedAt: string
  durationMinutes: number
  note: string
}

export interface UpdateRecurringTimeEntryNoteInput {
  id: string
  note: string
}

export interface RecurringTimerSession {
  taskId: string
  periodId: string
  startedAt: string
  runningSince: string
  pausedAccumulatedMs: number
  isPaused: boolean
}
```

- [ ] **Step 4: Replace storage progress methods with time-entry methods**

In `src/features/recurring/recurring.storage.ts`:

```ts
const TIME_ENTRIES_STORAGE_KEY = 'qingdan.recurring.timeEntries'

const recurringTimeEntrySchema = z.object({
  id: z.string(),
  periodId: z.string(),
  startedAt: z.string(),
  endedAt: z.string(),
  durationMinutes: z.number().int().min(0),
  note: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
```

Add Tauri wrappers:

```ts
export async function listRecurringTimeEntries(periodId: string): Promise<RecurringTimeEntry[]> {
  if (isTauriRuntime()) {
    return invoke<RecurringTimeEntry[]>('list_recurring_time_entries', { periodId })
  }

  const entries = loadLocalTimeEntriesRecord()
  return entries[periodId] ?? []
}

export async function createRecurringTimeEntry(
  input: CreateRecurringTimeEntryInput,
): Promise<RecurringTimeEntry[]> {
  if (isTauriRuntime()) {
    return invoke<RecurringTimeEntry[]>('create_recurring_time_entry', { input })
  }

  const allEntries = loadLocalTimeEntriesRecord()
  const timestamp = new Date().toISOString()
  const nextEntries = [
    {
      id: crypto.randomUUID(),
      periodId: input.periodId,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationMinutes: input.durationMinutes,
      note: input.note.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    ...(allEntries[input.periodId] ?? []),
  ]
  allEntries[input.periodId] = nextEntries
  saveLocalTimeEntriesRecord(allEntries)
  return nextEntries
}
```

Add `updateRecurringTimeEntryNote` and `deleteRecurringTimeEntry` with the same record-update pattern.

- [ ] **Step 5: Update Zustand store**

Rename state:

```ts
timeEntriesByPeriodId: Record<string, RecurringTimeEntry[]>
```

Expose actions:

```ts
addTimeEntry: (input: CreateRecurringTimeEntryInput) => Promise<void>
saveTimeEntryNote: (input: UpdateRecurringTimeEntryNoteInput) => Promise<void>
removeTimeEntry: (entryId: string) => Promise<void>
```

Use `listRecurringTimeEntries` inside `selectPeriod`.

- [ ] **Step 6: Update overview and reminders**

In `recurring.overview.ts`, return:

```ts
export interface RecurringOverviewItem {
  task: RecurringTask
  currentPeriod: RecurringPeriod | null
  targetMinutes: number
  completedMinutes: number
  remainingMinutes: number
  completionRate: number
  isCompleted: boolean
  latestEntry: RecurringTimeEntry | null
}

export interface RecurringOverviewSnapshot {
  taskCount: number
  totalTargetMinutes: number
  totalCompletedMinutes: number
  totalRemainingMinutes: number
  completionRate: number
  completedTaskCount: number
  incompleteTaskCount: number
  items: RecurringOverviewItem[]
}
```

Calculate `completedMinutes` from `durationMinutes` and `completionRate` with:

```ts
const completionRate = targetMinutes > 0 ? Math.round((completedMinutes / targetMinutes) * 100) : 0
```

Update reminders so a current period is submitted/completed only when accumulated minutes meet target.

- [ ] **Step 7: Run frontend state tests**

Run:

```powershell
npm.cmd test -- recurring.overview recurring.reminders recurring.storage recurringStore
```

Expected: pass.

- [ ] **Step 8: Commit frontend data layer**

```powershell
git add src/features/recurring src/stores/recurringStore.ts src/stores/recurringStore.test.ts
git commit -m "feat: add recurring time tracking data layer"
```

---

### Task 4: Recurring Task Creation And Editing Target Minutes

**Files:**
- Modify: `src/components/TaskComposer.tsx`
- Modify: `src/components/RecurringTaskList.tsx`
- Modify: `src/components/RecurringTaskList.test.tsx`

- [ ] **Step 1: Write failing component tests**

In `src/components/RecurringTaskList.test.tsx`, update fixtures to include `targetMinutesPerPeriod: 420` and add:

```ts
it('shows target, completed, and remaining minutes for recurring tasks', async () => {
  useRecurringStore.setState({
    tasks: [{ ...baseTask, targetMinutesPerPeriod: 420 }],
    periodsByTaskId: { 'recurring-1': [basePeriod] },
    timeEntriesByPeriodId: {
      'period-1': [
        {
          id: 'time-1',
          periodId: 'period-1',
          startedAt: '2026-05-06T08:00:00.000Z',
          endedAt: '2026-05-06T09:30:00.000Z',
          durationMinutes: 90,
          note: 'wrote tests',
          createdAt: '2026-05-06T09:30:00.000Z',
          updatedAt: '2026-05-06T09:30:00.000Z',
        },
      ],
    },
  })

  await act(async () => {
    root.render(<RecurringTaskList />)
  })

  expect(container.textContent).toContain('90 / 420')
  expect(container.textContent).toContain('还差 330 分钟')
})
```

- [ ] **Step 2: Run failing component tests**

Run:

```powershell
npm.cmd test -- RecurringTaskList
```

Expected: fail because UI still shows progress-entry language.

- [ ] **Step 3: Add target field to recurring creation**

In `TaskComposer.tsx`, add state:

```ts
const [recurringTargetMinutes, setRecurringTargetMinutes] = useState('420')
```

Include in submit:

```ts
targetMinutesPerPeriod: Math.max(1, Number(recurringTargetMinutes) || 420),
```

Add an input in the recurring task modal:

```tsx
<label htmlFor="recurring-target-minutes">每周期目标分钟数</label>
<input
  id="recurring-target-minutes"
  min="1"
  step="1"
  type="number"
  value={recurringTargetMinutes}
  onChange={(event) => setRecurringTargetMinutes(event.target.value)}
/>
```

- [ ] **Step 4: Update edit modal target field**

In `RecurringTaskList.tsx`, add:

```ts
const [editTargetMinutes, setEditTargetMinutes] = useState('420')
```

Populate on edit open:

```ts
setEditTargetMinutes(String(task.targetMinutesPerPeriod))
```

Include in save:

```ts
targetMinutesPerPeriod: Math.max(1, Number(editTargetMinutes) || 420),
```

- [ ] **Step 5: Run targeted UI tests**

Run:

```powershell
npm.cmd test -- RecurringTaskList TaskComposer
```

Expected: pass for recurring target display and edit flow.

- [ ] **Step 6: Commit target-minute UI**

```powershell
git add src/components/TaskComposer.tsx src/components/RecurringTaskList.tsx src/components/RecurringTaskList.test.tsx
git commit -m "feat: configure recurring target minutes"
```

---

### Task 5: Timer Modal And Time Entry Creation

**Files:**
- Modify: `src/components/RecurringTaskList.tsx`
- Modify: `src/components/RecurringTaskList.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add timer tests**

In `RecurringTaskList.test.tsx`, use fake timers:

```ts
it('opens timer modal and saves a time entry after ending a session', async () => {
  vi.useFakeTimers()
  const addTimeEntry = vi.fn().mockResolvedValue(undefined)
  useRecurringStore.setState({
    tasks: [baseTask],
    periodsByTaskId: { 'recurring-1': [basePeriod] },
    timeEntriesByPeriodId: { 'period-1': [] },
    addTimeEntry,
  })

  await act(async () => {
    root.render(<RecurringTaskList />)
  })

  container.querySelector<HTMLButtonElement>('[data-testid="start-recurring-timer"]')?.click()
  await act(async () => {
    vi.advanceTimersByTime(65_000)
  })
  container.querySelector<HTMLButtonElement>('[data-testid="finish-recurring-timer"]')?.click()
  const noteInput = container.querySelector<HTMLTextAreaElement>('#recurring-time-entry-note')
  expect(noteInput).toBeTruthy()
  noteInput!.value = 'finished design'
  noteInput!.dispatchEvent(new Event('input', { bubbles: true }))
  container.querySelector<HTMLButtonElement>('[data-testid="save-recurring-time-entry"]')?.click()

  expect(addTimeEntry).toHaveBeenCalledWith(
    expect.objectContaining({
      periodId: 'period-1',
      durationMinutes: 1,
      note: 'finished design',
    }),
  )
  vi.useRealTimers()
})
```

- [ ] **Step 2: Run failing timer test**

Run:

```powershell
npm.cmd test -- RecurringTaskList
```

Expected: fail because timer modal is not implemented.

- [ ] **Step 3: Implement timer session state**

In `RecurringTaskList.tsx`, add session state:

```ts
type TimerStep = 'running' | 'note'

const [timerTask, setTimerTask] = useState<RecurringTask | null>(null)
const [timerPeriod, setTimerPeriod] = useState<RecurringPeriod | null>(null)
const [timerStep, setTimerStep] = useState<TimerStep>('running')
const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null)
const [timerRunningSince, setTimerRunningSince] = useState<number | null>(null)
const [timerPausedAccumulatedMs, setTimerPausedAccumulatedMs] = useState(0)
const [timerPausedAt, setTimerPausedAt] = useState<number | null>(null)
const [timerEndedAt, setTimerEndedAt] = useState<string | null>(null)
const [timerNote, setTimerNote] = useState('')
```

Use a `setInterval` effect to refresh displayed elapsed seconds while running.

- [ ] **Step 4: Implement net duration calculation**

Add:

```ts
function calculateTimerDurationMinutes(nowMs = Date.now()) {
  if (!timerRunningSince) {
    return 0
  }
  const pausedMs = timerPausedAt ? timerPausedAccumulatedMs + (nowMs - timerPausedAt) : timerPausedAccumulatedMs
  const elapsedMs = Math.max(0, nowMs - timerRunningSince - pausedMs)
  return Math.floor(elapsedMs / 60_000)
}
```

Use this calculation for display and saving. Sessions below 1 minute cannot be saved as official records.

- [ ] **Step 5: Implement timer modal UI**

Add a full-screen modal:

```tsx
{timerTask && timerPeriod ? (
  <div className="modal-backdrop timer-backdrop" role="presentation">
    <section className="task-modal recurring-timer-modal" role="dialog" aria-modal="true">
      <div className="task-modal-header task-modal-console-header">
        <div>
          <p className="section-tag">周期任务计时</p>
          <h2>{timerTask.title}</h2>
        </div>
      </div>
      {timerStep === 'running' ? (
        <div className="recurring-timer-body">
          <strong className="recurring-timer-clock">{formatMinutes(calculateTimerDurationMinutes())}</strong>
          <button type="button" onClick={toggleTimerPause}>{timerPausedAt ? '继续' : '暂停'}</button>
          <button data-testid="finish-recurring-timer" type="button" onClick={finishTimer}>结束并记录</button>
          <button type="button" onClick={exitTimer}>退出</button>
        </div>
      ) : (
        <form onSubmit={(event) => void saveTimerEntry(event)}>
          <textarea id="recurring-time-entry-note" value={timerNote} onChange={(event) => setTimerNote(event.target.value)} />
          <button data-testid="save-recurring-time-entry" type="submit">保存时间记录</button>
        </form>
      )}
    </section>
  </div>
) : null}
```

Adapt class names and copy to current Chinese UI style.

- [ ] **Step 6: Add styles**

In `src/index.css`, add timer classes:

```css
.recurring-timer-modal {
  width: min(760px, calc(100vw - 32px));
}

.recurring-timer-clock {
  display: block;
  font-size: clamp(3rem, 10vw, 7rem);
  letter-spacing: 0.08em;
}

.recurring-timer-body {
  display: grid;
  gap: 20px;
}
```

Extend with existing console gradient, chip, and button language.

- [ ] **Step 7: Run timer tests**

Run:

```powershell
npm.cmd test -- RecurringTaskList
```

Expected: pass.

- [ ] **Step 8: Commit timer modal**

```powershell
git add src/components/RecurringTaskList.tsx src/components/RecurringTaskList.test.tsx src/index.css
git commit -m "feat: add recurring task timer modal"
```

---

### Task 6: Detail History, Edit Notes, And Delete Time Entries

**Files:**
- Modify: `src/components/RecurringTaskList.tsx`
- Modify: `src/components/RecurringTaskList.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add detail history tests**

Add tests:

```ts
it('groups recurring time entries by period in detail modal', async () => {
  useRecurringStore.setState({
    tasks: [baseTask],
    periodsByTaskId: { 'recurring-1': [basePeriod] },
    timeEntriesByPeriodId: {
      'period-1': [
        {
          id: 'time-1',
          periodId: 'period-1',
          startedAt: '2026-05-06T08:00:00.000Z',
          endedAt: '2026-05-06T09:30:00.000Z',
          durationMinutes: 90,
          note: 'deep work',
          createdAt: '2026-05-06T09:30:00.000Z',
          updatedAt: '2026-05-06T09:30:00.000Z',
        },
      ],
    },
  })

  await act(async () => {
    root.render(<RecurringTaskList />)
  })

  container.querySelector<HTMLButtonElement>('[data-testid="recurring-detail-button"]')?.click()

  expect(container.textContent).toContain('90 分钟')
  expect(container.textContent).toContain('deep work')
})
```

- [ ] **Step 2: Run failing detail tests**

Run:

```powershell
npm.cmd test -- RecurringTaskList
```

Expected: fail until detail modal uses time entries.

- [ ] **Step 3: Replace detail history rendering**

In `RecurringTaskList.tsx`, replace old progress history with per-period sections:

```tsx
{periods.map((period) => {
  const entries = timeEntriesByPeriodId[period.id] ?? []
  const completedMinutes = entries.reduce((total, entry) => total + entry.durationMinutes, 0)
  const rate = Math.round((completedMinutes / detailTask.targetMinutesPerPeriod) * 100)

  return (
    <section key={period.id} className="recurring-period-history-card">
      <header>
        <strong>{formatTaskDate(period.startAt, 'YYYY-MM-DD HH:mm')} - {formatTaskDate(period.endAt, 'YYYY-MM-DD HH:mm')}</strong>
        <span>{completedMinutes} / {detailTask.targetMinutesPerPeriod} 分钟 · {rate}%</span>
      </header>
      <ul className="recurring-time-entry-list">
        {entries.map((entry) => (
          <li key={entry.id} className="recurring-time-entry-card">
            <strong>{entry.durationMinutes} 分钟</strong>
            <span>{formatTaskDate(entry.startedAt, 'HH:mm')} - {formatTaskDate(entry.endedAt, 'HH:mm')}</span>
            <p>{entry.note || '未填写说明'}</p>
          </li>
        ))}
      </ul>
    </section>
  )
})}
```

- [ ] **Step 4: Add note edit and delete actions**

Use store actions:

```ts
const saveTimeEntryNote = useRecurringStore((state) => state.saveTimeEntryNote)
const removeTimeEntry = useRecurringStore((state) => state.removeTimeEntry)
```

Delete confirmation:

```ts
async function handleRemoveTimeEntry(entry: RecurringTimeEntry) {
  const confirmed = window.confirm('删除这条时间记录会影响本周期完成率，确认删除？')
  if (!confirmed) {
    return
  }
  await removeTimeEntry(entry.id)
}
```

- [ ] **Step 5: Run detail tests**

Run:

```powershell
npm.cmd test -- RecurringTaskList
```

Expected: pass.

- [ ] **Step 6: Commit detail history**

```powershell
git add src/components/RecurringTaskList.tsx src/components/RecurringTaskList.test.tsx src/index.css
git commit -m "feat: show recurring time entry history"
```

---

### Task 7: Task Overview Time-Driven Recurring Section

**Files:**
- Modify: `src/components/TaskOverview.tsx`
- Modify: `src/components/TaskOverview.test.tsx` if present; otherwise create targeted test in existing overview tests.
- Modify: `src/index.css`

- [ ] **Step 1: Add overview test**

Add a test that seeds `useRecurringStore` and opens overview:

```ts
it('shows recurring current-period target and completion minutes in task overview', async () => {
  useRecurringStore.setState({
    tasks: [baseRecurringTask],
    periodsByTaskId: { 'recurring-1': [basePeriod] },
    timeEntriesByPeriodId: {
      'period-1': [
        {
          id: 'time-1',
          periodId: 'period-1',
          startedAt: '2026-05-06T08:00:00.000Z',
          endedAt: '2026-05-06T09:00:00.000Z',
          durationMinutes: 60,
          note: 'morning session',
          createdAt: '2026-05-06T09:00:00.000Z',
          updatedAt: '2026-05-06T09:00:00.000Z',
        },
      ],
    },
  })

  await act(async () => {
    root.render(<TaskOverview />)
  })
  container.querySelector<HTMLButtonElement>('.overview-trigger-button')?.click()

  expect(container.textContent).toContain('周期任务完成情况')
  expect(container.textContent).toContain('60 / 420')
  expect(container.textContent).toContain('morning session')
})
```

- [ ] **Step 2: Run failing overview test**

Run:

```powershell
npm.cmd test -- TaskOverview recurring.overview
```

Expected: fail until the overview section is rewritten.

- [ ] **Step 3: Replace recurring overview cards**

In `TaskOverview.tsx`, replace the old four-stat recurring card with:

```tsx
<section className="overview-card overview-console-panel recurring-overview-panel">
  <div className="overview-card-header overview-console-panel-header">
    <div>
      <h3>周期任务完成情况</h3>
      <p>按当前周期统计全部周期任务的目标时间、完成时间和最近记录。</p>
    </div>
    <span className="overview-progress-pill">{recurringOverview.completionRate}%</span>
  </div>

  <div className="overview-weekly-grid">
    <article className="overview-weekly-item">
      <span>总目标</span>
      <strong>{recurringOverview.totalTargetMinutes}</strong>
      <small>分钟</small>
    </article>
    <article className="overview-weekly-item">
      <span>已完成</span>
      <strong>{recurringOverview.totalCompletedMinutes}</strong>
      <small>分钟</small>
    </article>
    <article className="overview-weekly-item">
      <span>剩余</span>
      <strong>{recurringOverview.totalRemainingMinutes}</strong>
      <small>分钟</small>
    </article>
    <article className="overview-weekly-item">
      <span>达标任务</span>
      <strong>{recurringOverview.completedTaskCount} / {recurringOverview.taskCount}</strong>
    </article>
  </div>

  <div className="recurring-overview-showcase">
    {recurringOverview.items.map((item) => (
      <article key={item.task.id} className="recurring-overview-task-card">
        <div>
          <strong>{item.task.title}</strong>
          <span>{item.completedMinutes} / {item.targetMinutes} 分钟</span>
        </div>
        <div className="overview-progress-track" aria-hidden="true">
          <span className="overview-progress-fill" style={{ width: `${Math.min(item.completionRate, 100)}%` }} />
        </div>
        <p>{item.latestEntry?.note || '暂无时间记录说明'}</p>
      </article>
    ))}
  </div>
</section>
```

- [ ] **Step 4: Add overview styles**

Add classes to `src/index.css`:

```css
.recurring-overview-showcase {
  display: grid;
  gap: 12px;
}

.recurring-overview-task-card {
  border: 1px solid rgba(125, 190, 255, 0.22);
  border-radius: 18px;
  padding: 14px;
  background: rgba(7, 17, 31, 0.72);
}
```

- [ ] **Step 5: Run overview tests**

Run:

```powershell
npm.cmd test -- TaskOverview recurring.overview
```

Expected: pass.

- [ ] **Step 6: Commit overview**

```powershell
git add src/components/TaskOverview.tsx src/index.css src/features/recurring/recurring.overview.ts src/features/recurring/recurring.overview.test.ts
git commit -m "feat: summarize recurring time progress"
```

---

### Task 8: Recovery Prompt, Docs, And Full Verification

**Files:**
- Modify: `src/features/recurring/recurring.storage.ts`
- Modify: `src/components/RecurringTaskList.tsx`
- Modify: `src/components/RecurringTaskList.test.tsx`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/PROJECT_CONSTRAINTS.md`
- Modify: `docs/WORKLOG.md`
- Create: `docs/V100_ACCEPTANCE.md`

- [ ] **Step 1: Add timer session persistence helpers**

In `recurring.storage.ts`, add:

```ts
const TIMER_SESSION_STORAGE_KEY = 'qingdan.recurring.activeTimerSession'

export function loadRecurringTimerSession(): RecurringTimerSession | null {
  const raw = window.localStorage.getItem(TIMER_SESSION_STORAGE_KEY)
  if (!raw) {
    return null
  }
  const parsed = JSON.parse(raw)
  const result = recurringTimerSessionSchema.safeParse(parsed)
  return result.success ? result.data : null
}

export function saveRecurringTimerSession(session: RecurringTimerSession) {
  window.localStorage.setItem(TIMER_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearRecurringTimerSession() {
  window.localStorage.removeItem(TIMER_SESSION_STORAGE_KEY)
}
```

- [ ] **Step 2: Add recovery behavior**

In `RecurringTaskList.tsx`, on mount:

```ts
useEffect(() => {
  const session = loadRecurringTimerSession()
  if (!session) {
    return
  }
  setRecoveredSession(session)
}, [])
```

Show a modal with actions:

- 恢复计时
- 保存到当前时间
- 丢弃

Saving to current time creates a time entry using `Math.floor((Date.now() - new Date(session.runningSince).getTime() - session.pausedAccumulatedMs) / 60_000)`.

- [ ] **Step 3: Add v1.0 acceptance doc**

Create `docs/V100_ACCEPTANCE.md`:

```markdown
# v1.0 手工验收清单

## 周期任务计时

- 周期任务列表首要动作是“开始计时”。
- 开始计时后展示全屏弹窗式计时器。
- 暂停/继续不计入净计时时长。
- 结束并记录后生成时间记录。
- 退出超过 1 分钟的会话时提示保存或丢弃。
- 重新打开应用时可处理未结束计时会话。

## 完成情况

- 每个周期任务有每周期目标分钟数。
- 当前周期累计分钟数达到目标即显示达标。
- 允许超额完成并显示超过 100% 的完成率。
- 详情按周期展示时间记录，说明可编辑，记录可删除。
- 任务概览展示全部周期任务当前周期总目标、已完成、剩余、完成率和任务晾晒。
```

- [ ] **Step 4: Update active docs to v1.0**

Update current pointers:

- `docs/ARCHITECTURE.md`: active version `v1.0.0`, acceptance `docs/V100_ACCEPTANCE.md`.
- `docs/PROJECT_CONSTRAINTS.md`: active version `v1.0.0`, acceptance `docs/V100_ACCEPTANCE.md`.
- `docs/WORKLOG.md`: active version `v1.0.0`, acceptance `docs/V100_ACCEPTANCE.md`, add current worklog entry.

- [ ] **Step 5: Run full verification**

Run:

```powershell
npm.cmd test
cargo test
npm.cmd run build
```

Expected: all pass.

- [ ] **Step 6: Commit recovery and docs**

```powershell
git add src/features/recurring/recurring.storage.ts src/components/RecurringTaskList.tsx src/components/RecurringTaskList.test.tsx docs/ARCHITECTURE.md docs/PROJECT_CONSTRAINTS.md docs/WORKLOG.md docs/V100_ACCEPTANCE.md
git commit -m "feat: recover recurring timer sessions"
```

---

### Task 9: Release Preparation For v1.0.0

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/Cargo.lock`
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Update version files**

Set app version to `1.0.0` in:

```text
package.json
package-lock.json
src-tauri/Cargo.toml
src-tauri/Cargo.lock
src-tauri/tauri.conf.json
```

- [ ] **Step 2: Run release verification**

Run:

```powershell
npm.cmd test
cargo test
npm.cmd run build
npm.cmd run tauri:build
```

Expected: all pass and installers are generated:

```text
src-tauri/target/release/bundle/nsis/轻单_1.0.0_x64-setup.exe
src-tauri/target/release/bundle/msi/轻单_1.0.0_x64_zh-CN.msi
```

- [ ] **Step 3: Commit release version**

```powershell
git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/tauri.conf.json
git commit -m "chore: release v1.0.0"
```

- [ ] **Step 4: Tag and release**

Run after final user approval:

```powershell
git tag -a v1.0.0 -m "v1.0.0"
git push origin master
git push origin v1.0.0
gh release create v1.0.0 "src-tauri/target/release/bundle/nsis/轻单_1.0.0_x64-setup.exe" "src-tauri/target/release/bundle/msi/轻单_1.0.0_x64_zh-CN.msi" --title "v1.0.0" --notes "v1.0 将周期任务升级为时间驱动，支持每周期目标分钟数、计时弹窗、时间记录、详情历史和任务概览完成情况。"
```

---

## Plan Self-Review

- Spec coverage: target minutes, timer modal, pause/continue, exit save/discard, recovery prompt, time-entry history, overview晒, legacy migration, and release requirements are covered.
- Placeholder scan: clear.
- Type consistency: frontend uses `RecurringTimeEntry`, `CreateRecurringTimeEntryInput`, `UpdateRecurringTimeEntryNoteInput`, and `timeEntriesByPeriodId`; backend uses matching camelCase serde structs and snake_case SQLite columns.
