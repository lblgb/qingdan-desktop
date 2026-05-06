import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListRecurringTasks = vi.fn()
const mockCreateRecurringTask = vi.fn()
const mockUpdateRecurringTask = vi.fn()
const mockListRecurringPeriods = vi.fn()
const mockListRecurringTimeEntries = vi.fn()
const mockCreateRecurringTimeEntry = vi.fn()
const mockUpdateRecurringTimeEntryNote = vi.fn()
const mockDeleteRecurringTimeEntry = vi.fn()

vi.mock('../features/recurring/recurring.storage', () => ({
  listRecurringTasks: mockListRecurringTasks,
  createRecurringTask: mockCreateRecurringTask,
  updateRecurringTask: mockUpdateRecurringTask,
  listRecurringPeriods: mockListRecurringPeriods,
  listRecurringTimeEntries: mockListRecurringTimeEntries,
  createRecurringTimeEntry: mockCreateRecurringTimeEntry,
  updateRecurringTimeEntryNote: mockUpdateRecurringTimeEntryNote,
  deleteRecurringTimeEntry: mockDeleteRecurringTimeEntry,
}))

async function loadStore() {
  vi.resetModules()
  return import('./recurringStore')
}

describe('recurringStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListRecurringTasks.mockResolvedValue([])
    mockCreateRecurringTask.mockResolvedValue([])
    mockUpdateRecurringTask.mockResolvedValue([])
    mockListRecurringPeriods.mockResolvedValue([])
    mockListRecurringTimeEntries.mockResolvedValue([])
    mockCreateRecurringTimeEntry.mockResolvedValue([])
    mockUpdateRecurringTimeEntryNote.mockResolvedValue([])
    mockDeleteRecurringTimeEntry.mockResolvedValue([])
  })

  it('hydrates tasks and selects the first recurring task', async () => {
    const { useRecurringStore } = await loadStore()
    mockListRecurringTasks.mockResolvedValueOnce([
      {
        id: 'task-1',
        title: 'Weekly report',
        description: '',
        cadenceUnit: 'week',
        cadenceInterval: 1,
        targetMinutesPerPeriod: 420,
        remindAtEnd: true,
        isActive: true,
        createdAt: '2026-05-01T08:00:00.000Z',
        updatedAt: '2026-05-01T08:00:00.000Z',
      },
    ])
    mockListRecurringPeriods.mockResolvedValueOnce([
      {
        id: 'period-1',
        taskId: 'task-1',
        startAt: '2026-05-01T08:00:00.000Z',
        endAt: '2026-05-08T08:00:00.000Z',
        closedAt: null,
        createdAt: '2026-05-01T08:00:00.000Z',
        updatedAt: '2026-05-01T08:00:00.000Z',
      },
    ])
    mockListRecurringTimeEntries.mockResolvedValueOnce([])

    await useRecurringStore.getState().hydrate()

    expect(useRecurringStore.getState().selectedTaskId).toBe('task-1')
    expect(useRecurringStore.getState().selectedPeriodId).toBe('period-1')
  })

  it('adds time entries to the selected period bucket', async () => {
    const { useRecurringStore } = await loadStore()
    mockCreateRecurringTimeEntry.mockResolvedValueOnce([
      {
        id: 'entry-1',
        periodId: 'period-1',
        startedAt: '2026-05-02T08:00:00.000Z',
        endedAt: '2026-05-02T09:30:00.000Z',
        durationMinutes: 90,
        note: 'read docs',
        createdAt: '2026-05-02T09:30:00.000Z',
        updatedAt: '2026-05-02T09:30:00.000Z',
      },
    ])

    await useRecurringStore.getState().addTimeEntry({
      periodId: 'period-1',
      startedAt: '2026-05-02T08:00:00.000Z',
      endedAt: '2026-05-02T09:30:00.000Z',
      durationMinutes: 90,
      note: 'read docs',
    })

    expect(useRecurringStore.getState().timeEntriesByPeriodId['period-1'][0].durationMinutes).toBe(90)
  })

  it('hydrates periods and time entries for all recurring tasks so overview totals are complete', async () => {
    const { useRecurringStore } = await loadStore()
    mockListRecurringTasks.mockResolvedValueOnce([
      {
        id: 'task-1',
        title: 'Weekly report',
        description: '',
        cadenceUnit: 'week',
        cadenceInterval: 1,
        targetMinutesPerPeriod: 420,
        remindAtEnd: true,
        isActive: true,
        createdAt: '2026-05-01T08:00:00.000Z',
        updatedAt: '2026-05-01T08:00:00.000Z',
      },
      {
        id: 'task-2',
        title: 'Practice',
        description: '',
        cadenceUnit: 'week',
        cadenceInterval: 1,
        targetMinutesPerPeriod: 120,
        remindAtEnd: true,
        isActive: true,
        createdAt: '2026-05-01T08:00:00.000Z',
        updatedAt: '2026-05-01T08:00:00.000Z',
      },
    ])
    mockListRecurringPeriods
      .mockResolvedValueOnce([
        {
          id: 'period-1',
          taskId: 'task-1',
          startAt: '2026-05-01T08:00:00.000Z',
          endAt: '2026-05-08T08:00:00.000Z',
          closedAt: null,
          createdAt: '2026-05-01T08:00:00.000Z',
          updatedAt: '2026-05-01T08:00:00.000Z',
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'period-2',
          taskId: 'task-2',
          startAt: '2026-05-01T08:00:00.000Z',
          endAt: '2026-05-08T08:00:00.000Z',
          closedAt: null,
          createdAt: '2026-05-01T08:00:00.000Z',
          updatedAt: '2026-05-01T08:00:00.000Z',
        },
      ])
    mockListRecurringTimeEntries.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'entry-2',
        periodId: 'period-2',
        startedAt: '2026-05-02T08:00:00.000Z',
        endedAt: '2026-05-02T09:00:00.000Z',
        durationMinutes: 60,
        note: 'practice',
        createdAt: '2026-05-02T09:00:00.000Z',
        updatedAt: '2026-05-02T09:00:00.000Z',
      },
    ])

    await useRecurringStore.getState().hydrate()

    const overview = useRecurringStore.getState().overview('2026-05-02T10:00:00.000Z')
    expect(overview.totalTargetMinutes).toBe(540)
    expect(overview.totalCompletedMinutes).toBe(60)
    expect(mockListRecurringPeriods).toHaveBeenCalledTimes(2)
    expect(mockListRecurringTimeEntries).toHaveBeenCalledTimes(2)
  })
})
