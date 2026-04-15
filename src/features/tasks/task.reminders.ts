import dayjs from 'dayjs'
import type { ReminderItem, ReminderPreferences, TaskItem } from './task.types'

export interface ReminderBuckets {
  overdue: ReminderItem[]
  upcoming: ReminderItem[]
  focusWithoutDate: ReminderItem[]
  recentlyReminded: ReminderItem[]
}

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  enableInApp: true,
  enableDesktop: false,
  priorityThreshold: 'high',
  offsetPreset: '1-hour',
  customOffsetMinutes: 120,
}

export const EMPTY_REMINDER_BUCKETS: ReminderBuckets = {
  overdue: [],
  upcoming: [],
  focusWithoutDate: [],
  recentlyReminded: [],
}

const PRIORITY_WEIGHT: Record<TaskItem['priority'], number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function priorityMeetsThreshold(
  priority: TaskItem['priority'],
  threshold: ReminderPreferences['priorityThreshold'],
) {
  return PRIORITY_WEIGHT[priority] <= PRIORITY_WEIGHT[threshold]
}

function createOverdueItem(task: TaskItem): ReminderItem {
  return {
    task,
    reason: 'overdue',
    dueLabel: '已逾期',
  }
}

function createFocusItem(task: TaskItem): ReminderItem {
  return {
    task,
    reason: 'focus-without-date',
    dueLabel: '未设置日期',
  }
}

export function deriveReminderBuckets(
  tasks: TaskItem[],
  preferences: ReminderPreferences,
  nowIso: string,
): ReminderBuckets {
  if (!preferences.enableInApp) {
    return EMPTY_REMINDER_BUCKETS
  }

  const now = dayjs(nowIso)
  const overdue: ReminderItem[] = []
  const focusWithoutDate: ReminderItem[] = []

  for (const task of tasks) {
    if (task.completed) {
      continue
    }

    if (!task.dueAt) {
      if (priorityMeetsThreshold(task.priority, 'high')) {
        focusWithoutDate.push(createFocusItem(task))
      }

      continue
    }

    if (dayjs(task.dueAt).isBefore(now) && priorityMeetsThreshold(task.priority, preferences.priorityThreshold)) {
      overdue.push(createOverdueItem(task))
    }
  }

  return {
    overdue,
    upcoming: [],
    focusWithoutDate,
    recentlyReminded: [],
  }
}
