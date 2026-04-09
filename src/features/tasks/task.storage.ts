/**
 * 文件说明：封装任务数据访问，桌面端优先走 Tauri 命令，浏览器环境回退到 localStorage。
 */
import { invoke } from '@tauri-apps/api/core'
import { z } from 'zod'
import { defaultTasks } from './task.mock'
import type {
  CreateTaskGroupInput,
  CreateTaskInput,
  TaskGroup,
  TaskItem,
  UpdateTaskGroupInput,
  UpdateTaskInput,
} from './task.types'

const STORAGE_KEY = 'qingdan.tasks'
const GROUP_STORAGE_KEY = 'qingdan.task-groups'

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  completed: z.boolean(),
  groupId: z.string().nullable(),
  dueAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const taskGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const taskListSchema = z.array(taskSchema)
const taskGroupListSchema = z.array(taskGroupSchema)

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

function loadLocalTaskGroups(): TaskGroup[] {
  const rawValue = window.localStorage.getItem(GROUP_STORAGE_KEY)
  if (!rawValue) {
    return []
  }

  const parsedValue = JSON.parse(rawValue)
  const result = taskGroupListSchema.safeParse(parsedValue)

  return result.success ? result.data : []
}

function saveLocalTaskGroups(groups: TaskGroup[]) {
  window.localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(groups))
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
      groupId: input.groupId,
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
          groupId: input.groupId,
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

/**
 * 读取任务组列表。
 */
export async function loadTaskGroups(): Promise<TaskGroup[]> {
  if (isTauriRuntime()) {
    return invoke<TaskGroup[]>('list_task_groups')
  }

  return loadLocalTaskGroups()
}

/**
 * 新建任务组。
 */
export async function createTaskGroup(input: CreateTaskGroupInput): Promise<TaskGroup[]> {
  if (isTauriRuntime()) {
    return invoke<TaskGroup[]>('create_task_group', { input })
  }

  const timestamp = new Date().toISOString()
  const nextGroups = [
    {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      description: input.description.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    ...loadLocalTaskGroups(),
  ]

  saveLocalTaskGroups(nextGroups)
  return nextGroups
}

/**
 * 编辑任务组。
 */
export async function updateTaskGroup(input: UpdateTaskGroupInput): Promise<TaskGroup[]> {
  if (isTauriRuntime()) {
    return invoke<TaskGroup[]>('update_task_group', { input })
  }

  const nextGroups = loadLocalTaskGroups().map((group) =>
    group.id === input.id
      ? {
          ...group,
          name: input.name.trim(),
          description: input.description.trim(),
          updatedAt: new Date().toISOString(),
        }
      : group,
  )

  saveLocalTaskGroups(nextGroups)
  return nextGroups
}

/**
 * 删除任务组。
 */
export async function deleteTaskGroup(groupId: string): Promise<TaskGroup[]> {
  if (isTauriRuntime()) {
    return invoke<TaskGroup[]>('delete_task_group', { groupId })
  }

  const nextTasks = loadLocalTasks().map((task) =>
    task.groupId === groupId ? { ...task, groupId: null, updatedAt: new Date().toISOString() } : task,
  )
  const nextGroups = loadLocalTaskGroups().filter((group) => group.id !== groupId)

  saveLocalTasks(nextTasks)
  saveLocalTaskGroups(nextGroups)
  return nextGroups
}

/**
 * 调整任务所属组。
 */
export async function assignTaskGroup(taskId: string, groupId: string | null): Promise<TaskItem[]> {
  if (isTauriRuntime()) {
    return invoke<TaskItem[]>('assign_task_group', { taskId, groupId })
  }

  const nextTasks = loadLocalTasks().map((task) =>
    task.id === taskId ? { ...task, groupId, updatedAt: new Date().toISOString() } : task,
  )

  saveLocalTasks(nextTasks)
  return nextTasks
}
