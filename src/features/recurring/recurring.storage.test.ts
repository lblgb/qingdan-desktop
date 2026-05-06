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
    window.localStorage.clear()
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

  it('rejects invalid local recurring time entries before saving', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).__TAURI_INTERNALS__
    const { createRecurringTimeEntry } = await import('./recurring.storage')

    await expect(
      createRecurringTimeEntry({
        periodId: 'period-1',
        startedAt: '2026-05-02T09:30:00.000Z',
        endedAt: '2026-05-02T08:00:00.000Z',
        durationMinutes: 0,
        note: 'invalid',
      }),
    ).rejects.toThrow('duration')
  })

  it('migrates legacy local progress entries into zero-minute time entries', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).__TAURI_INTERNALS__
    window.localStorage.setItem(
      'qingdan.recurring.entries',
      JSON.stringify({
        'period-1': [
          {
            id: 'legacy-1',
            periodId: 'period-1',
            content: 'old note',
            createdAt: '2026-05-02T08:00:00.000Z',
            updatedAt: '2026-05-02T09:00:00.000Z',
          },
        ],
      }),
    )
    const { listRecurringTimeEntries } = await import('./recurring.storage')

    const entries = await listRecurringTimeEntries('period-1')

    expect(entries).toEqual([
      {
        id: 'legacy-1',
        periodId: 'period-1',
        startedAt: '2026-05-02T08:00:00.000Z',
        endedAt: '2026-05-02T08:00:00.000Z',
        durationMinutes: 0,
        note: 'old note',
        createdAt: '2026-05-02T08:00:00.000Z',
        updatedAt: '2026-05-02T09:00:00.000Z',
      },
    ])
  })

  it('persists and clears local recurring timer session', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).__TAURI_INTERNALS__
    const { clearRecurringTimerSession, loadRecurringTimerSession, saveRecurringTimerSession } = await import('./recurring.storage')

    const session = {
      taskId: 'task-1',
      periodId: 'period-1',
      startedAt: '2026-05-02T08:00:00.000Z',
      runningSince: '2026-05-02T08:00:00.000Z',
      pausedAccumulatedMs: 60_000,
      isPaused: true,
    }

    saveRecurringTimerSession(session)
    expect(loadRecurringTimerSession()).toEqual(session)

    clearRecurringTimerSession()
    expect(loadRecurringTimerSession()).toBeNull()
  })
})
