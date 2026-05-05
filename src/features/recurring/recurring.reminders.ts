import dayjs from 'dayjs'
import type { RecurringPeriod, RecurringProgressEntry, RecurringTask } from './recurring.types'

export interface RecurringReminderItem {
  task: RecurringTask
  period: RecurringPeriod
}

export interface RecurringReminderSnapshot {
  pending: RecurringReminderItem[]
  overdue: RecurringReminderItem[]
}

export function deriveRecurringReminderSnapshot(
  tasks: RecurringTask[],
  periodsByTaskId: Record<string, RecurringPeriod[]>,
  entriesByPeriodId: Record<string, RecurringProgressEntry[]>,
  nowIso: string,
): RecurringReminderSnapshot {
  const now = dayjs(nowIso)
  const pending: RecurringReminderItem[] = []
  const overdue: RecurringReminderItem[] = []

  for (const task of tasks) {
    if (!task.isActive) {
      continue
    }

    for (const period of periodsByTaskId[task.id] ?? []) {
      const entries = entriesByPeriodId[period.id] ?? []
      if (entries.length > 0) {
        continue
      }

      const item = { task, period }
      pending.push(item)

      if (task.remindAtEnd && dayjs(period.endAt).isBefore(now)) {
        overdue.push(item)
      }
    }
  }

  return { pending, overdue }
}
