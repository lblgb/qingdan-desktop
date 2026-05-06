import { invoke } from '@tauri-apps/api/core'
import { z } from 'zod'
import type {
  CreateRecurringTaskInput,
  CreateRecurringTimeEntryInput,
  RecurringCadenceUnit,
  RecurringPeriod,
  RecurringTask,
  RecurringTimerSession,
  RecurringTimeEntry,
  UpdateRecurringTaskInput,
  UpdateRecurringTimeEntryNoteInput,
} from './recurring.types'

const TASKS_STORAGE_KEY = 'qingdan.recurring.tasks'
const PERIODS_STORAGE_KEY = 'qingdan.recurring.periods'
const TIME_ENTRIES_STORAGE_KEY = 'qingdan.recurring.timeEntries'
const LEGACY_ENTRIES_STORAGE_KEY = 'qingdan.recurring.entries'
const TIMER_SESSION_STORAGE_KEY = 'qingdan.recurring.timerSession'

const recurringTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  cadenceUnit: z.enum(['minute', 'hour', 'day', 'week']),
  cadenceInterval: z.number().int().positive(),
  targetMinutesPerPeriod: z.number().int().positive().default(420),
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

const recurringTimeEntrySchema = z.object({
  id: z.string(),
  periodId: z.string(),
  startedAt: z.string(),
  endedAt: z.string(),
  durationMinutes: z.number().int().min(0),
  note: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const legacyRecurringEntrySchema = z.object({
  id: z.string(),
  periodId: z.string(),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

const recurringTimerSessionSchema = z.object({
  taskId: z.string(),
  periodId: z.string(),
  startedAt: z.string(),
  runningSince: z.string(),
  pausedAccumulatedMs: z.number().int().min(0),
  isPaused: z.boolean(),
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

function loadLocalTimeEntriesRecord() {
  const raw = window.localStorage.getItem(TIME_ENTRIES_STORAGE_KEY)
  if (!raw) {
    return migrateLocalLegacyEntries()
  }

  const parsed = JSON.parse(raw)
  const result = z.record(z.string(), z.array(recurringTimeEntrySchema)).safeParse(parsed)
  return result.success ? result.data : {}
}

function saveLocalTimeEntriesRecord(entries: Record<string, RecurringTimeEntry[]>) {
  window.localStorage.setItem(TIME_ENTRIES_STORAGE_KEY, JSON.stringify(entries))
}

export function loadRecurringTimerSession(): RecurringTimerSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(TIMER_SESSION_STORAGE_KEY)
  if (!raw) {
    return null
  }

  const parsed = JSON.parse(raw)
  const result = recurringTimerSessionSchema.safeParse(parsed)
  return result.success ? result.data : null
}

export function saveRecurringTimerSession(session: RecurringTimerSession) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(TIMER_SESSION_STORAGE_KEY, JSON.stringify(session))
}

export function clearRecurringTimerSession() {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.removeItem(TIMER_SESSION_STORAGE_KEY)
}

function migrateLocalLegacyEntries() {
  const raw = window.localStorage.getItem(LEGACY_ENTRIES_STORAGE_KEY)
  if (!raw) {
    return {} as Record<string, RecurringTimeEntry[]>
  }

  const parsed = JSON.parse(raw)
  const result = z.record(z.string(), z.array(legacyRecurringEntrySchema)).safeParse(parsed)
  if (!result.success) {
    return {} as Record<string, RecurringTimeEntry[]>
  }

  const migrated = Object.fromEntries(
    Object.entries(result.data).map(([periodId, entries]) => [
      periodId,
      entries.map((entry) => ({
        id: entry.id,
        periodId: entry.periodId,
        startedAt: entry.createdAt,
        endedAt: entry.createdAt,
        durationMinutes: 0,
        note: entry.content,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
      })),
    ]),
  )
  saveLocalTimeEntriesRecord(migrated)
  return migrated
}

function validateTimeEntryInput(input: CreateRecurringTimeEntryInput) {
  if (input.durationMinutes < 1) {
    throw new Error('recurring time entry duration must be at least 1 minute')
  }
  if (new Date(input.startedAt).getTime() > new Date(input.endedAt).getTime()) {
    throw new Error('recurring time entry start cannot be after end')
  }
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
      targetMinutesPerPeriod: input.targetMinutesPerPeriod,
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
          targetMinutesPerPeriod: input.targetMinutesPerPeriod,
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
  const entries = loadLocalTimeEntriesRecord()
  for (const period of periods[taskId] ?? []) {
    delete entries[period.id]
  }
  delete periods[taskId]
  saveLocalTasks(tasks)
  saveLocalPeriodsRecord(periods)
  saveLocalTimeEntriesRecord(entries)
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

export async function listRecurringTimeEntries(periodId: string): Promise<RecurringTimeEntry[]> {
  if (isTauriRuntime()) {
    return invoke<RecurringTimeEntry[]>('list_recurring_time_entries', { periodId })
  }

  const entries = loadLocalTimeEntriesRecord()
  return entries[periodId] ?? []
}

export async function createRecurringTimeEntry(input: CreateRecurringTimeEntryInput): Promise<RecurringTimeEntry[]> {
  validateTimeEntryInput(input)

  if (isTauriRuntime()) {
    return invoke<RecurringTimeEntry[]>('create_recurring_time_entry', { input })
  }

  const allEntries = loadLocalTimeEntriesRecord()
  const timestamp = new Date().toISOString()
  const nextEntries = [
    {
      id: crypto.randomUUID(),
      periodId: input.periodId,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationMinutes: input.durationMinutes,
      note: input.note.trim(),
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    ...(allEntries[input.periodId] ?? []),
  ]
  allEntries[input.periodId] = nextEntries
  saveLocalTimeEntriesRecord(allEntries)
  return nextEntries
}

export async function updateRecurringTimeEntryNote(
  input: UpdateRecurringTimeEntryNoteInput,
): Promise<RecurringTimeEntry[]> {
  if (isTauriRuntime()) {
    return invoke<RecurringTimeEntry[]>('update_recurring_time_entry_note', { input })
  }

  const allEntries = loadLocalTimeEntriesRecord()
  const periodId = Object.keys(allEntries).find((key) => allEntries[key].some((entry) => entry.id === input.id))
  if (!periodId) {
    return []
  }

  allEntries[periodId] = allEntries[periodId].map((entry) =>
    entry.id === input.id ? { ...entry, note: input.note.trim(), updatedAt: new Date().toISOString() } : entry,
  )
  saveLocalTimeEntriesRecord(allEntries)
  return allEntries[periodId]
}

export async function deleteRecurringTimeEntry(entryId: string): Promise<RecurringTimeEntry[]> {
  if (isTauriRuntime()) {
    return invoke<RecurringTimeEntry[]>('delete_recurring_time_entry', { entryId })
  }

  const allEntries = loadLocalTimeEntriesRecord()
  const periodId = Object.keys(allEntries).find((key) => allEntries[key].some((entry) => entry.id === entryId))
  if (!periodId) {
    return []
  }

  allEntries[periodId] = allEntries[periodId].filter((entry) => entry.id !== entryId)
  saveLocalTimeEntriesRecord(allEntries)
  return allEntries[periodId]
}
