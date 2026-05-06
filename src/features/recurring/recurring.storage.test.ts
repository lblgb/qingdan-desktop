// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockInvoke = vi.fn()

vi.mock('@tauri-apps/api/core', () => {
  return {
    invoke: mockInvoke,
  }
})

describe('recurring.storage', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    Object.defineProperty(window, '__TAURI_INTERNALS__', {
      configurable: true,
      value: {},
    })
  })

  it('forwards recurring task creation to tauri', async () => {
    mockInvoke.mockResolvedValueOnce([])
    const { createRecurringTask } = await import('./recurring.storage')

    await createRecurringTask({
      title: 'Weekly report',
      description: 'submit progress',
      cadenceUnit: 'week',
      cadenceInterval: 1,
      targetMinutesPerPeriod: 420,
      remindAtEnd: true,
    })

    expect(mockInvoke).toHaveBeenCalledWith('create_recurring_task', {
      input: {
        title: 'Weekly report',
        description: 'submit progress',
        cadenceUnit: 'week',
        cadenceInterval: 1,
        targetMinutesPerPeriod: 420,
        remindAtEnd: true,
      },
    })
  })

  it('forwards recurring time entry creation to tauri', async () => {
    mockInvoke.mockResolvedValueOnce([])
    const { createRecurringTimeEntry } = await import('./recurring.storage')

    await createRecurringTimeEntry({
      periodId: 'period-1',
      startedAt: '2026-05-02T08:00:00.000Z',
      endedAt: '2026-05-02T09:30:00.000Z',
      durationMinutes: 90,
      note: 'read docs',
    })

    expect(mockInvoke).toHaveBeenCalledWith('create_recurring_time_entry', {
      input: {
        periodId: 'period-1',
        startedAt: '2026-05-02T08:00:00.000Z',
        endedAt: '2026-05-02T09:30:00.000Z',
        durationMinutes: 90,
        note: 'read docs',
      },
    })
  })
})
