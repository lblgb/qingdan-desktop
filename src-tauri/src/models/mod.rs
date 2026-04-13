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
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BulkUpdateTasksInput {
    pub task_ids: Vec<String>,
    pub priority: Option<TaskPriority>,
    pub group_id: Option<Option<String>>,
    pub mark_completed: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskItem {
    pub id: String,
    pub title: String,
    pub description: String,
    pub completed: bool,
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
