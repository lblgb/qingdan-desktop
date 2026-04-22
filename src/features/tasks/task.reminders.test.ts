import { describe, expect, it } from 'vitest'
import {
  DEFAULT_REMINDER_PREFERENCES,
  deriveDesktopNotificationItems,
  deriveReminderBuckets,
} from './task.reminders'
import type { TaskItem } from './task.types'

function buildTask(overrides: Partial<TaskItem>): TaskItem {
  return {
    id: 'task-1',
    title: '准备周报',
    description: '',
    note: '',
    completed: false,
    completedAt: null,
    archivedAt: null,
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

  it('includes due tasks inside the configured reminder threshold as upcoming reminders', () => {
    const tasks = [
      buildTask({ id: 'upcoming-urgent', dueAt: '2026-04-16T09:00:00.000Z', priority: 'urgent' }),
      buildTask({ id: 'upcoming-medium', dueAt: '2026-04-16T09:15:00.000Z', priority: 'medium' }),
      buildTask({ id: 'outside-window', dueAt: '2026-04-16T12:00:00.000Z', priority: 'urgent' }),
    ]

    const result = deriveReminderBuckets(tasks, DEFAULT_REMINDER_PREFERENCES, '2026-04-16T08:30:00.000Z')

    expect(result.upcoming.map((item) => item.task.id)).toEqual(['upcoming-urgent'])
  })
})

describe('DEFAULT_REMINDER_PREFERENCES', () => {
  it('uses 120 minutes as the custom reminder offset default', () => {
    expect(DEFAULT_REMINDER_PREFERENCES.customOffsetMinutes).toBe(120)
  })
})

describe('deriveDesktopNotificationItems', () => {
  it('only returns due tasks that meet the threshold and excludes undated reminders', () => {
    const tasks = [
      buildTask({ id: 'overdue-urgent', dueAt: '2026-04-16T07:00:00.000Z', priority: 'urgent' }),
      buildTask({ id: 'upcoming-high', dueAt: '2026-04-16T08:45:00.000Z', priority: 'high' }),
      buildTask({ id: 'upcoming-low', dueAt: '2026-04-16T08:40:00.000Z', priority: 'low' }),
      buildTask({ id: 'focus-high', dueAt: null, priority: 'high' }),
    ]

    const result = deriveDesktopNotificationItems(
      tasks,
      { ...DEFAULT_REMINDER_PREFERENCES, enableDesktop: true },
      '2026-04-16T08:30:00.000Z',
    )

    expect(result.map((item) => item.task.id)).toEqual(['overdue-urgent', 'upcoming-high'])
  })

  it('returns no desktop reminders when desktop notifications are disabled', () => {
    const tasks = [buildTask({ id: 'overdue-urgent', dueAt: '2026-04-16T07:00:00.000Z', priority: 'urgent' })]

    const result = deriveDesktopNotificationItems(
      tasks,
      { ...DEFAULT_REMINDER_PREFERENCES, enableDesktop: false },
      '2026-04-16T08:30:00.000Z',
    )

    expect(result).toEqual([])
  })
})
