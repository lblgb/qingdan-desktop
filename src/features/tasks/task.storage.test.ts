import { afterEach, describe, expect, it } from 'vitest'
import { loadReminderPreferences, saveReminderPreferences } from './task.storage'
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
    delete (globalThis as typeof globalThis & { window?: unknown }).window
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
