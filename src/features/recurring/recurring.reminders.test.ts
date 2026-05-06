import { describe, expect, it } from 'vitest'
import { deriveRecurringReminderSnapshot } from './recurring.reminders'
import type { RecurringPeriod, RecurringTask } from './recurring.types'

describe('recurring.reminders', () => {
  it('treats the current period with zero entries as pending', () => {
    const task: RecurringTask = {
      id: 'task-1',
      title: 'Weekly report',
      description: '',
      cadenceUnit: 'week',
      cadenceInterval: 1,
      targetMinutesPerPeriod: 120,
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

    const snapshot = deriveRecurringReminderSnapshot([task], { 'task-1': [period] }, {}, '2026-05-02T07:59:00.000Z')

    expect(snapshot.pending).toHaveLength(1)
    expect(snapshot.overdue).toHaveLength(0)
  })

  it('treats a period as pending until accumulated minutes meet the target', () => {
    const task: RecurringTask = {
      id: 'task-1',
      title: 'Practice',
      description: '',
      cadenceUnit: 'week',
      cadenceInterval: 1,
      targetMinutesPerPeriod: 120,
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

    const snapshot = deriveRecurringReminderSnapshot(
      [task],
      { 'task-1': [period] },
      {
        'period-1': [
          {
            id: 'entry-1',
            periodId: 'period-1',
            startedAt: '2026-05-01T09:00:00.000Z',
            endedAt: '2026-05-01T10:00:00.000Z',
            durationMinutes: 60,
            note: '',
            createdAt: '2026-05-01T10:00:00.000Z',
            updatedAt: '2026-05-01T10:00:00.000Z',
          },
        ],
      },
      '2026-05-02T07:59:00.000Z',
    )

    expect(snapshot.pending).toHaveLength(1)
    expect(snapshot.overdue).toHaveLength(0)
  })

  it('only evaluates the current period for reminder state', () => {
    const task: RecurringTask = {
      id: 'task-1',
      title: 'Practice',
      description: '',
      cadenceUnit: 'week',
      cadenceInterval: 1,
      targetMinutesPerPeriod: 120,
      remindAtEnd: true,
      isActive: true,
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
    }
    const previousPeriod: RecurringPeriod = {
      id: 'period-old',
      taskId: 'task-1',
      startAt: '2026-05-01T08:00:00.000Z',
      endAt: '2026-05-08T08:00:00.000Z',
      closedAt: null,
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
    }
    const currentPeriod: RecurringPeriod = {
      id: 'period-current',
      taskId: 'task-1',
      startAt: '2026-05-08T08:00:00.000Z',
      endAt: '2026-05-15T08:00:00.000Z',
      closedAt: null,
      createdAt: '2026-05-08T08:00:00.000Z',
      updatedAt: '2026-05-08T08:00:00.000Z',
    }

    const snapshot = deriveRecurringReminderSnapshot(
      [task],
      { 'task-1': [currentPeriod, previousPeriod] },
      {},
      '2026-05-10T08:00:00.000Z',
    )

    expect(snapshot.pending.map((item) => item.period.id)).toEqual(['period-current'])
    expect(snapshot.overdue).toHaveLength(0)
  })

  it('does not remind when no period contains the current time', () => {
    const task: RecurringTask = {
      id: 'task-1',
      title: 'Practice',
      description: '',
      cadenceUnit: 'week',
      cadenceInterval: 1,
      targetMinutesPerPeriod: 120,
      remindAtEnd: true,
      isActive: true,
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
    }
    const previousPeriod: RecurringPeriod = {
      id: 'period-old',
      taskId: 'task-1',
      startAt: '2026-05-01T08:00:00.000Z',
      endAt: '2026-05-08T08:00:00.000Z',
      closedAt: null,
      createdAt: '2026-05-01T08:00:00.000Z',
      updatedAt: '2026-05-01T08:00:00.000Z',
    }

    const snapshot = deriveRecurringReminderSnapshot([task], { 'task-1': [previousPeriod] }, {}, '2026-05-10T08:00:00.000Z')

    expect(snapshot.pending).toHaveLength(0)
    expect(snapshot.overdue).toHaveLength(0)
  })
})
