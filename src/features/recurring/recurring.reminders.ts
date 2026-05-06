import dayjs from 'dayjs'
import type { RecurringPeriod, RecurringTask, RecurringTimeEntry } from './recurring.types'

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
  entriesByPeriodId: Record<string, RecurringTimeEntry[]>,
  nowIso: string,
): RecurringReminderSnapshot {
  const now = dayjs(nowIso)
  const pending: RecurringReminderItem[] = []
  const overdue: RecurringReminderItem[] = []

  for (const task of tasks) {
    if (!task.isActive) {
      continue
    }

    const period = findCurrentPeriod(periodsByTaskId[task.id] ?? [], now)
    if (!period) {
      continue
    }

    const entries = entriesByPeriodId[period.id] ?? []
    const completedMinutes = entries.reduce((total, entry) => total + entry.durationMinutes, 0)
    if (completedMinutes >= task.targetMinutesPerPeriod) {
      continue
    }

    const item = { task, period }
    pending.push(item)

    if (task.remindAtEnd && dayjs(period.endAt).isBefore(now)) {
      overdue.push(item)
    }
  }

  return { pending, overdue }
}

function findCurrentPeriod(periods: RecurringPeriod[], now: dayjs.Dayjs) {
  return (
    periods.find((period) => {
      const start = dayjs(period.startAt)
      const end = dayjs(period.endAt)
      return (start.isBefore(now) || start.isSame(now)) && end.isAfter(now)
    }) ?? null
  )
}
