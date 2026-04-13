/**
 * 文件说明：提供批量操作模式的辅助常量与选择工具。
 */
import type { BulkUpdateTasksInput, TaskPriority } from './task.types'

export const BULK_PRIORITY_OPTIONS: TaskPriority[] = ['urgent', 'high', 'medium', 'low']

export function buildBulkPriorityInput(taskIds: string[], priority: TaskPriority): BulkUpdateTasksInput {
  return {
    taskIds,
    priority,
  }
}

export function buildBulkGroupInput(taskIds: string[], groupId: string | null): BulkUpdateTasksInput {
  return {
    taskIds,
    groupId,
  }
}

export function buildBulkCompleteInput(taskIds: string[], markCompleted = true): BulkUpdateTasksInput {
  return {
    taskIds,
    markCompleted,
  }
}
