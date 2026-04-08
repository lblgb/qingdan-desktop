/**
 * 文件说明：封装任务数据访问，桌面端优先走 Tauri 命令，浏览器环境回退到 localStorage。
 */
import { invoke } from '@tauri-apps/api/core'
import { z } from 'zod'
import { defaultTasks } from './task.mock'
import type { CreateTaskInput, TaskItem, UpdateTaskInput } from './task.types'

const STORAGE_KEY = 'qingdan.tasks'

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  completed: z.boolean(),
  dueAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const taskListSchema = z.array(taskSchema)

function isTauriRuntime() {
  if (typeof window === 'undefined') {
    return false
  }

  return '__TAURI_INTERNALS__' in window
}

function loadLocalTasks(): TaskItem[] {
  const rawValue = window.localStorage.getItem(STORAGE_KEY)
  if (!rawValue) {
    return defaultTasks
  }

  const parsedValue = JSON.parse(rawValue)
  const result = taskListSchema.safeParse(parsedValue)

  return result.success ? result.data : defaultTasks
}

function saveLocalTasks(tasks: TaskItem[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
}

/**
 * 读取任务列表。
 */
export async function loadTasks(): Promise<TaskItem[]> {
  if (isTauriRuntime()) {
    return invoke<TaskItem[]>('list_tasks')
  }

  return loadLocalTasks()
}

/**
 * 新建任务。
 */
export async function createTask(input: CreateTaskInput): Promise<TaskItem[]> {
  if (isTauriRuntime()) {
    return invoke<TaskItem[]>('create_task', { input })
  }

  const timestamp = new Date().toISOString()
  const nextTasks = [
    {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: input.description.trim(),
      completed: false,
      dueAt: input.dueAt,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    ...loadLocalTasks(),
  ]

  saveLocalTasks(nextTasks)
  return nextTasks
}

/**
 * 编辑任务。
 */
export async function updateTask(input: UpdateTaskInput): Promise<TaskItem[]> {
  if (isTauriRuntime()) {
    return invoke<TaskItem[]>('update_task', { input })
  }

  const nextTasks = loadLocalTasks().map((task) =>
    task.id === input.id
      ? {
          ...task,
          title: input.title.trim(),
          description: input.description.trim(),
          dueAt: input.dueAt,
          updatedAt: new Date().toISOString(),
        }
      : task,
  )

  saveLocalTasks(nextTasks)
  return nextTasks
}

/**
 * 切换任务完成状态。
 */
export async function toggleTask(taskId: string): Promise<TaskItem[]> {
  if (isTauriRuntime()) {
    return invoke<TaskItem[]>('toggle_task', { taskId })
  }

  const nextTasks = loadLocalTasks().map((task) =>
    task.id === taskId
      ? { ...task, completed: !task.completed, updatedAt: new Date().toISOString() }
      : task,
  )

  saveLocalTasks(nextTasks)
  return nextTasks
}

/**
 * 删除任务。
 */
export async function deleteTask(taskId: string): Promise<TaskItem[]> {
  if (isTauriRuntime()) {
    return invoke<TaskItem[]>('delete_task', { taskId })
  }

  const nextTasks = loadLocalTasks().filter((task) => task.id !== taskId)
  saveLocalTasks(nextTasks)
  return nextTasks
}
