import { describe, expect, it } from 'vitest'
import { DEFAULT_REMINDER_PREFERENCES, deriveReminderBuckets } from './task.reminders'
import type { TaskItem } from './task.types'

function buildTask(overrides: Partial<TaskItem>): TaskItem {
  return {
    id: 'task-1',
    title: '准备周报',
    description: '',
    completed: false,
    groupId: null,
    dueAt: null,
    priority: 'high',
    createdAt: '2026-04-16T08:00:00.000Z',
    updatedAt: '2026-04-16T08:00:00.000Z',
    ...overrides,
  }
}

describe('deriveReminderBuckets', () => {
  it('includes overdue and undated high-priority tasks in app reminders', () => {
    const tasks = [
      buildTask({ id: 'overdue-urgent', dueAt: '2026-04-15T07:00:00.000Z', priority: 'urgent' }),
      buildTask({ id: 'overdue-medium', dueAt: '2026-04-15T07:00:00.000Z', priority: 'medium' }),
      buildTask({ id: 'focus-high', dueAt: null, priority: 'high' }),
    ]

    const result = deriveReminderBuckets(tasks, DEFAULT_REMINDER_PREFERENCES, '2026-04-16T08:30:00.000Z')

    expect(result.overdue.map((item) => item.task.id)).toEqual(['overdue-urgent'])
    expect(result.focusWithoutDate.map((item) => item.task.id)).toEqual(['focus-high'])
  })
})

describe('DEFAULT_REMINDER_PREFERENCES', () => {
  it('uses 120 minutes as the custom reminder offset default', () => {
    expect(DEFAULT_REMINDER_PREFERENCES.customOffsetMinutes).toBe(120)
  })
})
