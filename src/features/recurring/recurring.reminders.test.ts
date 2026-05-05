import { describe, expect, it } from 'vitest'
import { deriveRecurringReminderSnapshot } from './recurring.reminders'
import type { RecurringPeriod, RecurringTask } from './recurring.types'

describe('recurring.reminders', () => {
  it('treats a period with zero entries as pending and overdue after endAt', () => {
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

    const snapshot = deriveRecurringReminderSnapshot([task], { 'task-1': [period] }, {}, '2026-05-02T08:30:00.000Z')

    expect(snapshot.pending).toHaveLength(1)
    expect(snapshot.overdue).toHaveLength(1)
  })
})
