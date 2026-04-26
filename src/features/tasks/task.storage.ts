/**
 * 文件说明：封装任务数据访问，桌面端优先走 Tauri 命令，浏览器环境回退到 localStorage。
 */
import { invoke } from '@tauri-apps/api/core'
import { z } from 'zod'
import { applyTaskQuery } from './task.filters'
import { DEFAULT_REMINDER_PREFERENCES } from './task.reminders'
import { defaultTasks } from './task.mock'
import type {
  BackupCommandResult,
  BulkUpdateTasksInput,
  CreateTaskGroupInput,
  CreateTaskInput,
  ExportCommandResult,
  ReminderPreferences,
  TaskGroup,
  TaskExportFormat,
  TaskExportScope,
  TaskItem,
  TaskQueryInput,
  UpdateTaskGroupInput,
  UpdateTaskInput,
} from './task.types'

const STORAGE_KEY = 'qingdan.tasks'
const GROUP_STORAGE_KEY = 'qingdan.task-groups'
const REMINDER_PREFERENCES_STORAGE_KEY = 'qingdan.reminder-preferences'

const taskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  note: z.string().catch(''),
  completed: z.boolean(),
  completedAt: z.string().nullable().catch(null),
  archivedAt: z.string().nullable().catch(null),
  groupId: z.string().nullable(),
  dueAt: z.string().nullable(),
  priority: z.enum(['urgent', 'high', 'medium', 'low']).catch('medium'),
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

const reminderPreferencesSchema = z.object({
  enableInApp: z.boolean(),
  enableDesktop: z.boolean(),
  priorityThreshold: z.enum(['urgent', 'high', 'medium']).catch('high'),
  offsetPreset: z.enum(['at-time', '10-minutes', '1-hour', '1-day', 'custom']).catch('1-hour'),
  customOffsetMinutes: z.number().int().nonnegative().catch(120),
})

const backupCommandResultSchema = z.object({
  backupPath: z.string(),
})

const exportCommandResultSchema = z.object({
  exportPath: z.string(),
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

function loadLocalReminderPreferences(): ReminderPreferences {
  const rawValue = window.localStorage.getItem(REMINDER_PREFERENCES_STORAGE_KEY)
  if (!rawValue) {
    return DEFAULT_REMINDER_PREFERENCES
  }

  try {
    const parsedValue = JSON.parse(rawValue)
    const result = reminderPreferencesSchema.safeParse(parsedValue)

    return result.success ? result.data : DEFAULT_REMINDER_PREFERENCES
  } catch {
    return DEFAULT_REMINDER_PREFERENCES
  }
}

function saveLocalReminderPreferences(preferences: ReminderPreferences) {
  window.localStorage.setItem(REMINDER_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
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
 * 按统一查询输入读取任务列表。
 */
export async function queryTasks(input: TaskQueryInput): Promise<TaskItem[]> {
  if (isTauriRuntime()) {
    const tauriInput = {
      status: input.status === 'all' ? null : input.status,
      archive: input.archive,
      groupId: input.group === 'all-groups' ? null : input.group,
      priority: input.priority === 'all-priorities' ? null : input.priority,
      dateRange:
        input.dateRange === 'all-time' || input.dateRange === 'no-date'
          ? null
          : buildDateRangePayload(input.dateRange),
      sortBy: input.sortBy,
    }

    if (input.dateRange === 'no-date') {
      const tasks = await invoke<TaskItem[]>('query_tasks', {
        input: tauriInput,
      })
      return applyTaskQuery(tasks, input)
    }

    return invoke<TaskItem[]>('query_tasks', {
      input: tauriInput,
    })
  }

  return applyTaskQuery(loadLocalTasks(), input)
}

/**
 * 新建任务。
 */
export async function createTask(input: CreateTaskInput): Promise<TaskItem[]> {
  if (isTauriRuntime()) {
    return invoke<TaskItem[]>('create_task', {
      input: {
        ...input,
        note: input.note?.trim() ?? '',
      },
    })
  }

  const timestamp = new Date().toISOString()
  const nextTasks = [
    {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: input.description.trim(),
      note: input.note?.trim() ?? '',
      completed: false,
      completedAt: null,
      archivedAt: null,
      groupId: input.groupId,
      dueAt: input.dueAt,
      priority: input.priority,
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
    return invoke<TaskItem[]>('update_task', {
      input: {
        ...input,
        note: input.note?.trim() ?? '',
      },
    })
  }

  const nextTasks = loadLocalTasks().map((task) =>
    task.id === input.id
      ? {
          ...task,
          title: input.title.trim(),
          description: input.description.trim(),
          note: input.note?.trim() ?? task.note,
          groupId: input.groupId,
          dueAt: input.dueAt,
          priority: input.priority,
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
      ? {
          ...task,
          completed: !task.completed,
          completedAt: task.completed ? null : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
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
 * 批量更新任务。
 */
export async function bulkUpdateTasks(input: BulkUpdateTasksInput): Promise<TaskItem[]> {
  if (isTauriRuntime()) {
    return invoke<TaskItem[]>('bulk_update_tasks', {
      input: {
        taskIds: input.taskIds,
        priority: input.priority ?? null,
        groupId: Object.prototype.hasOwnProperty.call(input, 'groupId') ? input.groupId ?? null : undefined,
        markCompleted: input.markCompleted ?? null,
        archive: input.archive ?? null,
      },
    })
  }

  const timestamp = new Date().toISOString()
  const nextTasks = loadLocalTasks().map((task) => {
    if (!input.taskIds.includes(task.id)) {
      return task
    }

    const completed = input.markCompleted ?? task.completed

    return {
      ...task,
      priority: input.priority ?? task.priority,
      groupId: Object.prototype.hasOwnProperty.call(input, 'groupId') ? (input.groupId ?? null) : task.groupId,
      completed,
      completedAt: input.markCompleted === undefined ? task.completedAt : completed ? timestamp : null,
      archivedAt: input.archive === true && completed ? (task.archivedAt ?? timestamp) : task.archivedAt,
      updatedAt: timestamp,
    }
  })

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
 * 读取提醒偏好。
 */
export async function loadReminderPreferences(): Promise<ReminderPreferences> {
  if (typeof window === 'undefined') {
    return DEFAULT_REMINDER_PREFERENCES
  }

  return loadLocalReminderPreferences()
}

/**
 * 保存提醒偏好。
 */
export async function saveReminderPreferences(
  preferences: ReminderPreferences,
): Promise<ReminderPreferences> {
  if (typeof window === 'undefined') {
    return preferences
  }

  saveLocalReminderPreferences(preferences)
  return preferences
}

export async function createBackup(backupPath: string): Promise<string> {
  if (!isTauriRuntime()) {
    throw new Error('Backup commands require desktop runtime')
  }

  const result = await invoke<BackupCommandResult>('create_backup', {
    input: {
      backupPath,
    },
  })

  return backupCommandResultSchema.parse(result).backupPath
}

export async function restoreBackup(backupPath: string): Promise<string> {
  if (!isTauriRuntime()) {
    throw new Error('Backup commands require desktop runtime')
  }

  const result = await invoke<BackupCommandResult>('restore_backup', {
    input: {
      backupPath,
    },
  })

  return backupCommandResultSchema.parse(result).backupPath
}

export async function exportTasks(
  exportPath: string,
  format: TaskExportFormat,
  scope: TaskExportScope = 'all',
  reminderPreferences: ReminderPreferences = DEFAULT_REMINDER_PREFERENCES,
): Promise<string> {
  if (!isTauriRuntime()) {
    throw new Error('Export commands require desktop runtime')
  }

  const result = await invoke<ExportCommandResult>('export_tasks', {
    input: {
      exportPath,
      format,
      scope,
      reminderPreferences,
    },
  })

  return exportCommandResultSchema.parse(result).exportPath
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

function buildDateRangePayload(dateRange: TaskQueryInput['dateRange']) {
  const today = new Date()
  const todayValue = today.toISOString().slice(0, 10)

  if (dateRange === 'today') {
    return {
      start: todayValue,
      end: todayValue,
    }
  }

  if (dateRange === 'upcoming') {
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    return {
      start: todayValue,
      end: nextWeek.toISOString().slice(0, 10),
    }
  }

  if (dateRange === 'overdue') {
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    return {
      end: yesterday.toISOString().slice(0, 10),
    }
  }

  return null
}
