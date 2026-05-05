import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockListRecurringTasks = vi.fn()
const mockCreateRecurringTask = vi.fn()
const mockUpdateRecurringTask = vi.fn()
const mockListRecurringPeriods = vi.fn()
const mockListRecurringProgressEntries = vi.fn()
const mockCreateRecurringProgressEntry = vi.fn()
const mockUpdateRecurringProgressEntry = vi.fn()

vi.mock('../features/recurring/recurring.storage', () => ({
  listRecurringTasks: mockListRecurringTasks,
  createRecurringTask: mockCreateRecurringTask,
  updateRecurringTask: mockUpdateRecurringTask,
  listRecurringPeriods: mockListRecurringPeriods,
  listRecurringProgressEntries: mockListRecurringProgressEntries,
  createRecurringProgressEntry: mockCreateRecurringProgressEntry,
  updateRecurringProgressEntry: mockUpdateRecurringProgressEntry,
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
    mockListRecurringProgressEntries.mockResolvedValue([])
    mockCreateRecurringProgressEntry.mockResolvedValue([])
    mockUpdateRecurringProgressEntry.mockResolvedValue([])
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
    mockListRecurringProgressEntries.mockResolvedValueOnce([])

    await useRecurringStore.getState().hydrate()

    expect(useRecurringStore.getState().selectedTaskId).toBe('task-1')
    expect(useRecurringStore.getState().selectedPeriodId).toBe('period-1')
  })
})
