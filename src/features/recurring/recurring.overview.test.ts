import { describe, expect, it } from 'vitest'
import { buildRecurringOverview } from './recurring.overview'
import type { RecurringPeriod, RecurringTask } from './recurring.types'

describe('recurring.overview', () => {
  it('summarizes recurring task, pending period, overdue period, and progress counts', () => {
    const task: RecurringTask = {
      id: 'task-1',
      title: 'Weekly report',
      description: '',
      cadenceUnit: 'week',
      cadenceInterval: 1,
      remindAtEnd: true,
      isActive: true,
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
    }

    const period: RecurringPeriod = {
      id: 'period-1',
      taskId: 'task-1',
      startAt: '2026-05-01T08:00:00.000Z',
      endAt: '2026-05-02T08:00:00.000Z',
      closedAt: null,
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
    }

    const snapshot = buildRecurringOverview(
      [task],
      { 'task-1': [period] },
      {
        'period-2': [
          {
            id: 'entry-1',
            periodId: 'period-2',
            content: 'done',
            createdAt: '2026-05-01T10:00:00.000Z',
            updatedAt: '2026-05-01T10:00:00.000Z',
          },
        ],
      },
      '2026-05-02T09:00:00.000Z',
    )

    expect(snapshot).toEqual({
      taskCount: 1,
      pendingPeriodCount: 1,
      overduePeriodCount: 1,
      progressEntryCount: 1,
    })
  })
})
