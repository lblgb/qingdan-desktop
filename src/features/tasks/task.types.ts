/**
 * 文件说明：任务领域类型定义，供前端状态和后续 Tauri 命令共享语义。
 */
export type TaskFilter = 'all' | 'active' | 'completed'

export type TaskGroupFilter = 'all-groups' | 'ungrouped' | string

export type TaskPriority = 'urgent' | 'high' | 'medium' | 'low'

export type TaskPriorityFilter = 'all-priorities' | TaskPriority

export type TaskDateRangeFilter = 'all-time' | 'today' | 'upcoming' | 'overdue' | 'no-date'

export type TaskSortBy = 'default' | 'due-date' | 'priority' | 'updated'

/**
 * 任务实体。
 */
export interface TaskItem {
  id: string
  title: string
  description: string
  completed: boolean
  groupId: string | null
  dueAt: string | null
  priority: TaskPriority
  createdAt: string
  updatedAt: string
}

/**
 * 任务组实体。
 */
export interface TaskGroup {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
}

/**
 * 创建任务时的输入结构。
 */
export interface CreateTaskInput {
  title: string
  description: string
  groupId: string | null
  dueAt: string | null
  priority: TaskPriority
}

/**
 * 编辑任务时的输入结构。
 */
export interface UpdateTaskInput {
  id: string
  title: string
  description: string
  groupId: string | null
  dueAt: string | null
  priority: TaskPriority
}

/**
 * 创建任务组时的输入结构。
 */
export interface CreateTaskGroupInput {
  name: string
  description: string
}

/**
 * 编辑任务组时的输入结构。
 */
export interface UpdateTaskGroupInput {
  id: string
  name: string
  description: string
}

export interface TaskQueryInput {
  status: TaskFilter
  group: TaskGroupFilter
  priority: TaskPriorityFilter
  dateRange: TaskDateRangeFilter
  sortBy: TaskSortBy
}

export interface BulkUpdateTasksInput {
  taskIds: string[]
  priority?: TaskPriority
  groupId?: string | null
  markCompleted?: boolean
}
