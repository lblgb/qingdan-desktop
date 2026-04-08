/**
 * 文件说明：任务领域类型定义，供前端状态和后续 Tauri 命令共享语义。
 */
export type TaskFilter = 'all' | 'active' | 'completed'

/**
 * 任务实体。
 */
export interface TaskItem {
  id: string
  title: string
  description: string
  completed: boolean
  dueAt: string | null
  createdAt: string
  updatedAt: string
}

/**
 * 创建任务时的输入结构。
 */
export interface CreateTaskInput {
  title: string
  description: string
  dueAt: string | null
}

/**
 * 编辑任务时的输入结构。
 */
export interface UpdateTaskInput {
  id: string
  title: string
  description: string
  dueAt: string | null
}
