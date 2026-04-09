/**
 * 文件说明：任务领域类型定义，供前端状态和后续 Tauri 命令共享语义。
 */
export type TaskFilter = 'all' | 'active' | 'completed'

export type TaskGroupFilter = 'all-groups' | 'ungrouped' | string

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
