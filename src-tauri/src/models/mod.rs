//! 文件说明：Rust 侧任务模型定义，为后续数据库映射和命令返回预留结构。

use serde::{Deserialize, Serialize};

/// 任务实体模型。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TaskItem {
    pub id: String,
    pub title: String,
    pub description: String,
    pub completed: bool,
    pub due_at: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

/// 新建任务输入。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTaskInput {
    pub title: String,
    pub description: String,
    pub due_at: Option<String>,
}

/// 编辑任务输入。
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTaskInput {
    pub id: String,
    pub title: String,
    pub description: String,
    pub due_at: Option<String>,
}
