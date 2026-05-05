import { invoke } from '@tauri-apps/api/core'
import { z } from 'zod'
import type {
  CreateRecurringProgressEntryInput,
  CreateRecurringTaskInput,
  RecurringCadenceUnit,
  RecurringPeriod,
  RecurringProgressEntry,
  RecurringTask,
  UpdateRecurringProgressEntryInput,
  UpdateRecurringTaskInput,
} from './recurring.types'

const TASKS_STORAGE_KEY = 'qingdan.recurring.tasks'
const PERIODS_STORAGE_KEY = 'qingdan.recurring.periods'
const ENTRIES_STORAGE_KEY = 'qingdan.recurring.entries'

const recurringTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  cadenceUnit: z.enum(['minute', 'hour', 'day', 'week']),
  cadenceInterval: z.number().int().positive(),
  remindAtEnd: z.boolean(),
  isActive: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const recurringPeriodSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  startAt: z.string(),
  endAt: z.string(),
  closedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const recurringEntrySchema = z.object({
  id: z.string(),
  periodId: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

function isTauriRuntime() {
  if (typeof window === 'undefined') {
    return false
  }

  return '__TAURI_INTERNALS__' in window
}

function loadLocalTasks() {
  const raw = window.localStorage.getItem(TASKS_STORAGE_KEY)
  if (!raw) {
    return [] as RecurringTask[]
  }

  const parsed = JSON.parse(raw)
  const result = z.array(recurringTaskSchema).safeParse(parsed)
  return result.success ? result.data : []
}

function saveLocalTasks(tasks: RecurringTask[]) {
  window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks))
}

function loadLocalPeriodsRecord() {
  const raw = window.localStorage.getItem(PERIODS_STORAGE_KEY)
  if (!raw) {
    return {} as Record<string, RecurringPeriod[]>
  }

  const parsed = JSON.parse(raw)
  const result = z.record(z.string(), z.array(recurringPeriodSchema)).safeParse(parsed)
  return result.success ? result.data : {}
}

function saveLocalPeriodsRecord(periods: Record<string, RecurringPeriod[]>) {
  window.localStorage.setItem(PERIODS_STORAGE_KEY, JSON.stringify(periods))
}

function loadLocalEntriesRecord() {
  const raw = window.localStorage.getItem(ENTRIES_STORAGE_KEY)
  if (!raw) {
    return {} as Record<string, RecurringProgressEntry[]>
  }

  const parsed = JSON.parse(raw)
  const result = z.record(z.string(), z.array(recurringEntrySchema)).safeParse(parsed)
  return result.success ? result.data : {}
}

function saveLocalEntriesRecord(entries: Record<string, RecurringProgressEntry[]>) {
  window.localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries))
}

function toCadenceMs(unit: RecurringCadenceUnit, interval: number) {
  switch (unit) {
    case 'minute':
      return interval * 60_000
    case 'hour':
      return interval * 60 * 60_000
    case 'day':
      return interval * 24 * 60 * 60_000
    case 'week':
      return interval * 7 * 24 * 60 * 60_000
  }
}

function syncLocalPeriods(task: RecurringTask) {
  const allPeriods = loadLocalPeriodsRecord()
  const current = allPeriods[task.id] ?? []
  const durationMs = toCadenceMs(task.cadenceUnit, task.cadenceInterval)
  const nowValue = Date.now()

  if (current.length === 0) {
    const startAt = new Date(task.createdAt)
    const endAt = new Date(startAt.getTime() + durationMs)
    allPeriods[task.id] = [
      {
        id: crypto.randomUUID(),
        taskId: task.id,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        closedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]
    saveLocalPeriodsRecord(allPeriods)
    return allPeriods[task.id]
  }

  const nextPeriods = [...current].sort((left, right) => left.startAt.localeCompare(right.startAt))
  while (new Date(nextPeriods[nextPeriods.length - 1].endAt).getTime() <= nowValue) {
    const last = nextPeriods[nextPeriods.length - 1]
    const startAt = new Date(last.endAt)
    const endAt = new Date(startAt.getTime() + durationMs)
    nextPeriods.push({
      id: crypto.randomUUID(),
      taskId: task.id,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      closedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  allPeriods[task.id] = nextPeriods
  saveLocalPeriodsRecord(allPeriods)
  return nextPeriods
}

export async function listRecurringTasks(): Promise<RecurringTask[]> {
  if (isTauriRuntime()) {
    return invoke<RecurringTask[]>('list_recurring_tasks')
  }

  return loadLocalTasks()
}

export async function createRecurringTask(input: CreateRecurringTaskInput): Promise<RecurringTask[]> {
  if (isTauriRuntime()) {
    return invoke<RecurringTask[]>('create_recurring_task', { input })
  }

  const timestamp = new Date().toISOString()
  const tasks = [
    {
      id: crypto.randomUUID(),
      title: input.title.trim(),
      description: input.description.trim(),
      cadenceUnit: input.cadenceUnit,
      cadenceInterval: input.cadenceInterval,
      remindAtEnd: input.remindAtEnd,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    ...loadLocalTasks(),
  ]
  saveLocalTasks(tasks)
  syncLocalPeriods(tasks[0])
  return tasks
}

export async function updateRecurringTask(input: UpdateRecurringTaskInput): Promise<RecurringTask[]> {
  if (isTauriRuntime()) {
    return invoke<RecurringTask[]>('update_recurring_task', { input })
  }

  const tasks = loadLocalTasks().map((task) =>
    task.id === input.id
      ? {
          ...task,
          title: input.title.trim(),
          description: input.description.trim(),
          cadenceUnit: input.cadenceUnit,
          cadenceInterval: input.cadenceInterval,
          remindAtEnd: input.remindAtEnd,
          isActive: input.isActive,
          updatedAt: new Date().toISOString(),
        }
      : task,
  )
  saveLocalTasks(tasks)
  const updated = tasks.find((task) => task.id === input.id)
  if (updated) {
    syncLocalPeriods(updated)
  }
  return tasks
}

export async function deleteRecurringTask(taskId: string): Promise<RecurringTask[]> {
  if (isTauriRuntime()) {
    return invoke<RecurringTask[]>('delete_recurring_task', { taskId })
  }

  const tasks = loadLocalTasks().filter((task) => task.id !== taskId)
  const periods = loadLocalPeriodsRecord()
  const entries = loadLocalEntriesRecord()
  for (const period of periods[taskId] ?? []) {
    delete entries[period.id]
  }
  delete periods[taskId]
  saveLocalTasks(tasks)
  saveLocalPeriodsRecord(periods)
  saveLocalEntriesRecord(entries)
  return tasks
}

export async function listRecurringPeriods(taskId: string): Promise<RecurringPeriod[]> {
  if (isTauriRuntime()) {
    return invoke<RecurringPeriod[]>('list_recurring_periods', { taskId })
  }

  const task = loadLocalTasks().find((item) => item.id === taskId)
  if (!task) {
    return []
  }

  return [...syncLocalPeriods(task)].sort((left, right) => right.startAt.localeCompare(left.startAt))
}

export async function listRecurringProgressEntries(periodId: string): Promise<RecurringProgressEntry[]> {
  if (isTauriRuntime()) {
    return invoke<RecurringProgressEntry[]>('list_recurring_progress_entries', { periodId })
  }

  const entries = loadLocalEntriesRecord()
  return entries[periodId] ?? []
}

export async function createRecurringProgressEntry(
  input: CreateRecurringProgressEntryInput,
): Promise<RecurringProgressEntry[]> {
  if (isTauriRuntime()) {
    return invoke<RecurringProgressEntry[]>('create_recurring_progress_entry', { input })
  }

  const allEntries = loadLocalEntriesRecord()
  const timestamp = new Date().toISOString()
  const nextEntries = [
    {
      id: crypto.randomUUID(),
      periodId: input.periodId,
      content: input.content.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    ...(allEntries[input.periodId] ?? []),
  ]
  allEntries[input.periodId] = nextEntries
  saveLocalEntriesRecord(allEntries)
  return nextEntries
}

export async function updateRecurringProgressEntry(
  input: UpdateRecurringProgressEntryInput,
): Promise<RecurringProgressEntry[]> {
  if (isTauriRuntime()) {
    return invoke<RecurringProgressEntry[]>('update_recurring_progress_entry', { input })
  }

  const allEntries = loadLocalEntriesRecord()
  const periodId = Object.keys(allEntries).find((key) => allEntries[key].some((entry) => entry.id === input.id))
  if (!periodId) {
    return []
  }

  allEntries[periodId] = allEntries[periodId].map((entry) =>
    entry.id === input.id ? { ...entry, content: input.content.trim(), updatedAt: new Date().toISOString() } : entry,
  )
  saveLocalEntriesRecord(allEntries)
  return allEntries[periodId]
}
