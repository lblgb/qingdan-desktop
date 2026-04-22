import { afterEach, describe, expect, it } from 'vitest'
import { loadReminderPreferences, queryTasks, saveReminderPreferences } from './task.storage'
import type { ReminderPreferences } from './task.types'

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
})
