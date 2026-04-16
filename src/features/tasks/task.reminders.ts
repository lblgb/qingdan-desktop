import dayjs from 'dayjs'
import type { ReminderItem, ReminderPreferences, TaskItem } from './task.types'

export interface ReminderBuckets {
  overdue: ReminderItem[]
  upcoming: ReminderItem[]
  focusWithoutDate: ReminderItem[]
  recentlyReminded: ReminderItem[]
}

export interface DesktopReminderItem extends ReminderItem {
  notificationKey: string
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

function getReminderOffsetMinutes(preferences: ReminderPreferences) {
  switch (preferences.offsetPreset) {
    case 'at-time':
      return 0
    case '10-minutes':
      return 10
    case '1-hour':
      return 60
    case '1-day':
      return 1_440
    case 'custom':
      return preferences.customOffsetMinutes
    default:
      return 60
  }
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

function createUpcomingItem(task: TaskItem, now: dayjs.Dayjs): ReminderItem {
  if (!task.dueAt) {
    return {
      task,
      reason: 'upcoming',
      dueLabel: '即将到期',
    }
  }

  const dueAt = dayjs(task.dueAt)
  const minutesUntilDue = Math.max(Math.ceil(dueAt.diff(now, 'minute', true)), 0)

  if (minutesUntilDue <= 0) {
    return {
      task,
      reason: 'upcoming',
      dueLabel: '即将到期',
    }
  }

  if (minutesUntilDue < 60) {
    return {
      task,
      reason: 'upcoming',
      dueLabel: `${minutesUntilDue} 分钟后到期`,
    }
  }

  const hoursUntilDue = Math.ceil(minutesUntilDue / 60)
  if (hoursUntilDue < 24) {
    return {
      task,
      reason: 'upcoming',
      dueLabel: `${hoursUntilDue} 小时后到期`,
    }
  }

  return {
    task,
    reason: 'upcoming',
    dueLabel: `${Math.ceil(hoursUntilDue / 24)} 天后到期`,
  }
}

function createDesktopNotificationKey(item: ReminderItem) {
  return `${item.reason}:${item.task.id}:${item.task.dueAt ?? 'no-date'}`
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
  const upcoming: ReminderItem[] = []
  const focusWithoutDate: ReminderItem[] = []
  const reminderOffsetMinutes = getReminderOffsetMinutes(preferences)

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

    if (!priorityMeetsThreshold(task.priority, preferences.priorityThreshold)) {
      continue
    }

    const dueAt = dayjs(task.dueAt)
    if (dueAt.isBefore(now)) {
      overdue.push(createOverdueItem(task))
      continue
    }

    if (dueAt.diff(now, 'minute', true) <= reminderOffsetMinutes) {
      upcoming.push(createUpcomingItem(task, now))
    }
  }

  return {
    overdue,
    upcoming,
    focusWithoutDate,
    recentlyReminded: [],
  }
}

export function deriveDesktopNotificationItems(
  tasks: TaskItem[],
  preferences: ReminderPreferences,
  nowIso: string,
): DesktopReminderItem[] {
  if (!preferences.enableDesktop) {
    return []
  }

  const buckets = deriveReminderBuckets(tasks, { ...preferences, enableInApp: true }, nowIso)
  return [...buckets.overdue, ...buckets.upcoming].map((item) => ({
    ...item,
    notificationKey: createDesktopNotificationKey(item),
  }))
}
