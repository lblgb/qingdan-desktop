use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TaskPriority {
    Urgent,
    High,
    Medium,
    Low,
}

impl TaskPriority {
    pub fn as_db_value(self) -> &'static str {
        match self {
            TaskPriority::Urgent => "urgent",
            TaskPriority::High => "high",
            TaskPriority::Medium => "medium",
            TaskPriority::Low => "low",
        }
    }

    pub fn from_db_value(value: &str) -> Self {
        match value {
            "urgent" => TaskPriority::Urgent,
            "high" => TaskPriority::High,
            "low" => TaskPriority::Low,
            _ => TaskPriority::Medium,
        }
    }
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TaskQueryStatus {
    Active,
    Completed,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum TaskArchiveFilter {
    Active,
    Archived,
    All,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "kebab-case")]
pub enum TaskQuerySortBy {
    Default,
    DueDate,
    Priority,
    Updated,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskDateRangeInput {
    pub start: Option<String>,
    pub end: Option<String>,
}

#[derive(Debug, Clone, Default, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskQueryInput {
    pub status: Option<TaskQueryStatus>,
    pub group_id: Option<String>,
    pub priority: Option<TaskPriority>,
    pub date_range: Option<TaskDateRangeInput>,
    pub sort_by: Option<TaskQuerySortBy>,
    pub archive: Option<TaskArchiveFilter>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkUpdateTasksInput {
    pub task_ids: Vec<String>,
    pub priority: Option<TaskPriority>,
    pub group_id: Option<Option<String>>,
    pub mark_completed: Option<bool>,
    pub archive: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskItem {
    pub id: String,
    pub title: String,
    pub description: String,
    pub note: String,
    pub completed: bool,
    pub completed_at: Option<String>,
    pub archived_at: Option<String>,
    pub group_id: Option<String>,
    pub due_at: Option<String>,
    pub priority: TaskPriority,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskGroup {
    pub id: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub title: String,
    pub description: String,
    pub note: String,
    pub group_id: Option<String>,
    pub due_at: Option<String>,
    pub priority: TaskPriority,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub id: String,
    pub title: String,
    pub description: String,
    pub note: String,
    pub group_id: Option<String>,
    pub due_at: Option<String>,
    pub priority: TaskPriority,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskGroupInput {
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskGroupInput {
    pub id: String,
    pub name: String,
    pub description: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateBackupInput {
    pub backup_path: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBackupInput {
    pub backup_path: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupCommandResult {
    pub backup_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ReminderPreferencesExport {
    pub enable_in_app: bool,
    pub enable_desktop: bool,
    pub priority_threshold: String,
    pub offset_preset: String,
    pub custom_offset_minutes: i64,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Json,
    Csv,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum ExportScope {
    All,
    Filtered,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportTasksInput {
    pub export_path: String,
    pub format: ExportFormat,
    pub scope: ExportScope,
    pub reminder_preferences: ReminderPreferencesExport,
    pub query: Option<TaskQueryInput>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportCommandResult {
    pub export_path: String,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum RecurringCadenceUnit {
    Minute,
    Hour,
    Day,
    Week,
}

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
pub struct RecurringPeriod {
    pub id: String,
    pub task_id: String,
    pub start_at: String,
    pub end_at: String,
    pub closed_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RecurringProgressEntry {
    pub id: String,
    pub period_id: String,
    pub content: String,
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
pub struct CreateRecurringProgressEntryInput {
    pub period_id: String,
    pub content: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateRecurringProgressEntryInput {
    pub id: String,
    pub content: String,
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
