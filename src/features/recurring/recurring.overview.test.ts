import { describe, expect, it } from 'vitest'
import { buildRecurringOverview } from './recurring.overview'
import type { RecurringPeriod, RecurringTask } from './recurring.types'

describe('recurring.overview', () => {
  it('summarizes recurring task current-period totals', () => {
    const task: RecurringTask = {
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
        'period-1': [
          {
            id: 'entry-1',
            periodId: 'period-1',
            startedAt: '2026-05-01T10:00:00.000Z',
            endedAt: '2026-05-01T11:00:00.000Z',
            durationMinutes: 60,
            note: 'done',
            createdAt: '2026-05-01T10:00:00.000Z',
            updatedAt: '2026-05-01T10:00:00.000Z',
          },
        ],
      },
      '2026-05-01T12:00:00.000Z',
    )

    expect(snapshot.taskCount).toBe(1)
    expect(snapshot.totalTargetMinutes).toBe(420)
    expect(snapshot.totalCompletedMinutes).toBe(60)
    expect(snapshot.totalRemainingMinutes).toBe(360)
    expect(snapshot.completedTaskCount).toBe(0)
    expect(snapshot.incompleteTaskCount).toBe(1)
  })

  it('summarizes current-period target and completed minutes for recurring tasks', () => {
    const task: RecurringTask = {
      id: 'task-1',
      title: 'Study',
      description: '',
      cadenceUnit: 'week',
      cadenceInterval: 1,
      targetMinutesPerPeriod: 420,
      remindAtEnd: true,
      isActive: true,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    }
    const period: RecurringPeriod = {
      id: 'period-1',
      taskId: 'task-1',
      startAt: '2026-05-01T00:00:00.000Z',
      endAt: '2026-05-08T00:00:00.000Z',
      closedAt: null,
      createdAt: '2026-05-01T00:00:00.000Z',
      updatedAt: '2026-05-01T00:00:00.000Z',
    }

    const snapshot = buildRecurringOverview(
      [task],
      { 'task-1': [period] },
      {
        'period-1': [
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
        ],
      },
      '2026-05-02T10:00:00.000Z',
    )

    expect(snapshot.totalTargetMinutes).toBe(420)
    expect(snapshot.totalCompletedMinutes).toBe(90)
    expect(snapshot.totalRemainingMinutes).toBe(330)
    expect(snapshot.items[0].completionRate).toBe(21)
    expect(snapshot.items[0].latestEntry?.note).toBe('read docs')
  })
})
