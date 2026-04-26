import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_REMINDER_PREFERENCES } from './task.reminders'
import {
  bulkUpdateTasks,
  createBackup,
  exportTasks,
  loadReminderPreferences,
  loadTasks,
  queryTasks,
  restoreBackup,
  saveReminderPreferences,
  updateTask,
} from './task.storage'
import type { ReminderPreferences, TaskItem, UpdateTaskInput } from './task.types'

const mockInvoke = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mockInvoke,
}))

function createLocalStorage(initialData: Record<string, string> = {}) {
  const store = new Map(Object.entries(initialData))

  return {
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
}

const originalWindow = globalThis.window

afterEach(() => {
  vi.clearAllMocks()

  if (originalWindow === undefined) {
    Reflect.deleteProperty(globalThis, 'window')
    return
  }

  ;(globalThis as typeof globalThis & { window?: Window }).window = originalWindow
})

describe('reminder preference storage', () => {
  it('persists and loads reminder preferences in a Tauri webview runtime', async () => {
    const localStorage = createLocalStorage()
    ;(globalThis as typeof globalThis & { window: Window & { __TAURI_INTERNALS__: unknown } }).window = {
      localStorage: localStorage as never,
      __TAURI_INTERNALS__: {},
    } as never

    const nextPreferences: ReminderPreferences = {
      enableInApp: false,
      enableDesktop: true,
      priorityThreshold: 'urgent',
      offsetPreset: 'custom',
      customOffsetMinutes: 180,
    }

    await saveReminderPreferences(nextPreferences)
    expect(localStorage.getItem('qingdan.reminder-preferences')).toBe(JSON.stringify(nextPreferences))
    await expect(loadReminderPreferences()).resolves.toEqual(nextPreferences)
  })

  it('falls back to 120 minutes when stored reminder preferences are invalid', async () => {
    const localStorage = createLocalStorage({
      'qingdan.reminder-preferences': JSON.stringify({
        enableInApp: true,
        enableDesktop: false,
        priorityThreshold: 'high',
        offsetPreset: 'custom',
        customOffsetMinutes: -1,
      }),
    })
    ;(globalThis as typeof globalThis & { window: Window }).window = {
      localStorage: localStorage as never,
    } as never

    const loadedPreferences = await loadReminderPreferences()
    expect(loadedPreferences.customOffsetMinutes).toBe(120)
  })
})

describe('task query storage', () => {
  function buildTask(overrides: Partial<TaskItem> = {}): TaskItem {
    return {
      id: 'task-1',
      title: 'Task',
      description: '',
      note: '',
      completed: false,
      completedAt: null,
      archivedAt: null,
      groupId: null,
      dueAt: null,
      priority: 'medium',
      createdAt: '2026-04-10T08:00:00.000Z',
      updatedAt: '2026-04-10T09:00:00.000Z',
      ...overrides,
    }
  }

  it('loads local fallback tasks with required archive metadata', async () => {
    const localStorage = createLocalStorage()
    ;(globalThis as typeof globalThis & { window: Window }).window = {
      localStorage: localStorage as never,
    } as never

    const tasks = await loadTasks()

    expect(tasks).not.toHaveLength(0)
    expect(tasks.every((task) => typeof task.note === 'string')).toBe(true)
    expect(tasks.every((task) => Object.prototype.hasOwnProperty.call(task, 'completedAt'))).toBe(true)
    expect(tasks.every((task) => Object.prototype.hasOwnProperty.call(task, 'archivedAt'))).toBe(true)
  })

  it('hides archived local tasks by default', async () => {
    const localStorage = createLocalStorage({
      'qingdan.tasks': JSON.stringify([
        {
          id: 'active-task',
          title: 'Active task',
          description: '',
          completed: false,
          groupId: null,
          dueAt: null,
          priority: 'medium',
          createdAt: '2026-04-10T08:00:00.000Z',
          updatedAt: '2026-04-10T09:00:00.000Z',
          note: '',
          completedAt: null,
          archivedAt: null,
        },
        {
          id: 'archived-task',
          title: 'Archived task',
          description: '',
          completed: true,
          groupId: null,
          dueAt: null,
          priority: 'medium',
          createdAt: '2026-04-10T08:00:00.000Z',
          updatedAt: '2026-04-10T09:00:00.000Z',
          note: '',
          completedAt: '2026-04-11T08:00:00.000Z',
          archivedAt: '2026-04-12T08:00:00.000Z',
        },
      ]),
    })
    ;(globalThis as typeof globalThis & { window: Window }).window = {
      localStorage: localStorage as never,
    } as never

    const tasks = await queryTasks({
      status: 'all',
      group: 'all-groups',
      priority: 'all-priorities',
      dateRange: 'all-time',
      sortBy: 'default',
      archive: 'active',
    })

    expect(tasks.map((task) => task.id)).toEqual(['active-task'])
  })

  it('loads only archived local tasks when archive filter is archived', async () => {
    const localStorage = createLocalStorage({
      'qingdan.tasks': JSON.stringify([
        {
          id: 'active-task',
          title: 'Active task',
          description: '',
          completed: false,
          groupId: null,
          dueAt: null,
          priority: 'medium',
          createdAt: '2026-04-10T08:00:00.000Z',
          updatedAt: '2026-04-10T09:00:00.000Z',
          note: '',
          completedAt: null,
          archivedAt: null,
        },
        {
          id: 'archived-task',
          title: 'Archived task',
          description: '',
          completed: true,
          groupId: null,
          dueAt: null,
          priority: 'medium',
          createdAt: '2026-04-10T08:00:00.000Z',
          updatedAt: '2026-04-10T09:00:00.000Z',
          note: '',
          completedAt: '2026-04-11T08:00:00.000Z',
          archivedAt: '2026-04-12T08:00:00.000Z',
        },
      ]),
    })
    ;(globalThis as typeof globalThis & { window: Window }).window = {
      localStorage: localStorage as never,
    } as never

    const tasks = await queryTasks({
      status: 'all',
      group: 'all-groups',
      priority: 'all-priorities',
      dateRange: 'all-time',
      sortBy: 'default',
      archive: 'archived',
    })

    expect(tasks.map((task) => task.id)).toEqual(['archived-task'])
  })

  it('preserves an existing local task note when legacy update input omits note', async () => {
    const localStorage = createLocalStorage({
      'qingdan.tasks': JSON.stringify([
        buildTask({
          id: 'task-with-note',
          title: 'Original title',
          description: 'Original description',
          note: 'Keep this note',
        }),
      ]),
    })
    ;(globalThis as typeof globalThis & { window: Window }).window = {
      localStorage: localStorage as never,
    } as never

    const tasks = await updateTask({
      id: 'task-with-note',
      title: 'Updated title',
      description: 'Updated description',
      groupId: null,
      dueAt: null,
      priority: 'high',
    } as Omit<UpdateTaskInput, 'note'> as UpdateTaskInput)

    expect(tasks[0]).toMatchObject({
      id: 'task-with-note',
      title: 'Updated title',
      description: 'Updated description',
      note: 'Keep this note',
      priority: 'high',
    })
  })

  it('queries Tauri no-date tasks with the requested archive scope before client filtering', async () => {
    ;(globalThis as typeof globalThis & { window: Window & { __TAURI_INTERNALS__: unknown } }).window = {
      localStorage: createLocalStorage() as never,
      __TAURI_INTERNALS__: {},
    } as never
    mockInvoke.mockResolvedValue([
      buildTask({ id: 'archived-no-date', completed: true, archivedAt: '2026-04-12T08:00:00.000Z' }),
      buildTask({ id: 'archived-with-date', dueAt: '2026-04-13', completed: true, archivedAt: '2026-04-12T08:00:00.000Z' }),
    ])

    const tasks = await queryTasks({
      status: 'all',
      group: 'all-groups',
      priority: 'all-priorities',
      dateRange: 'no-date',
      sortBy: 'default',
      archive: 'archived',
    })

    expect(mockInvoke).toHaveBeenCalledWith('query_tasks', {
      input: {
        status: null,
        archive: 'archived',
        groupId: null,
        priority: null,
        dateRange: null,
        sortBy: 'default',
      },
    })
    expect(tasks.map((task) => task.id)).toEqual(['archived-no-date'])
  })

  it('queries Tauri no-date tasks with all archive scope before client filtering', async () => {
    ;(globalThis as typeof globalThis & { window: Window & { __TAURI_INTERNALS__: unknown } }).window = {
      localStorage: createLocalStorage() as never,
      __TAURI_INTERNALS__: {},
    } as never
    mockInvoke.mockResolvedValue([
      buildTask({ id: 'active-no-date' }),
      buildTask({ id: 'archived-no-date', completed: true, archivedAt: '2026-04-12T08:00:00.000Z' }),
      buildTask({ id: 'active-with-date', dueAt: '2026-04-13' }),
    ])

    const tasks = await queryTasks({
      status: 'all',
      group: 'all-groups',
      priority: 'all-priorities',
      dateRange: 'no-date',
      sortBy: 'default',
      archive: 'all',
    })

    expect(mockInvoke).toHaveBeenCalledWith('query_tasks', {
      input: {
        status: null,
        archive: 'all',
        groupId: null,
        priority: null,
        dateRange: null,
        sortBy: 'default',
      },
    })
    expect(tasks.map((task) => task.id)).toEqual(['active-no-date', 'archived-no-date'])
  })

  it('archives completed local tasks without archiving active selections', async () => {
    const localStorage = createLocalStorage({
      'qingdan.tasks': JSON.stringify([
        buildTask({ id: 'completed-task', completed: true }),
        buildTask({ id: 'active-task', completed: false }),
      ]),
    })
    ;(globalThis as typeof globalThis & { window: Window }).window = {
      localStorage: localStorage as never,
    } as never

    const tasks = await bulkUpdateTasks({
      taskIds: ['completed-task', 'active-task'],
      archive: true,
    })

    expect(tasks.find((task) => task.id === 'completed-task')?.archivedAt).not.toBeNull()
    expect(tasks.find((task) => task.id === 'active-task')?.archivedAt).toBeNull()
  })

  it('maps create backup to the Tauri command payload', async () => {
    ;(globalThis as typeof globalThis & { window: Window & { __TAURI_INTERNALS__: unknown } }).window = {
      localStorage: createLocalStorage() as never,
      __TAURI_INTERNALS__: {},
    } as never
    mockInvoke.mockResolvedValue({ backupPath: 'C:\\backup\\qingdan.db' })

    const result = await createBackup('C:\\backup\\qingdan.db')

    expect(mockInvoke).toHaveBeenCalledWith('create_backup', {
      input: {
        backupPath: 'C:\\backup\\qingdan.db',
      },
    })
    expect(result).toBe('C:\\backup\\qingdan.db')
  })

  it('maps restore backup to the Tauri command payload', async () => {
    ;(globalThis as typeof globalThis & { window: Window & { __TAURI_INTERNALS__: unknown } }).window = {
      localStorage: createLocalStorage() as never,
      __TAURI_INTERNALS__: {},
    } as never
    mockInvoke.mockResolvedValue({ backupPath: 'C:\\backup\\qingdan.db' })

    const result = await restoreBackup('C:\\backup\\qingdan.db')

    expect(mockInvoke).toHaveBeenCalledWith('restore_backup', {
      input: {
        backupPath: 'C:\\backup\\qingdan.db',
      },
    })
    expect(result).toBe('C:\\backup\\qingdan.db')
  })

  it('maps export tasks to the Tauri command payload for full json export', async () => {
    ;(globalThis as typeof globalThis & { window: Window & { __TAURI_INTERNALS__: unknown } }).window = {
      localStorage: createLocalStorage() as never,
      __TAURI_INTERNALS__: {},
    } as never
    mockInvoke.mockResolvedValue({ exportPath: 'C:\\backup\\qingdan-export.json' })

    const result = await exportTasks('C:\\backup\\qingdan-export.json', 'json', 'all', DEFAULT_REMINDER_PREFERENCES)

    expect(mockInvoke).toHaveBeenCalledWith('export_tasks', {
      input: {
        exportPath: 'C:\\backup\\qingdan-export.json',
        format: 'json',
        scope: 'all',
        reminderPreferences: DEFAULT_REMINDER_PREFERENCES,
      },
    })
    expect(result).toBe('C:\\backup\\qingdan-export.json')
  })
})
