import type { RecurringPeriod, RecurringProgressEntry, RecurringTask } from './recurring.types'
import { deriveRecurringReminderSnapshot } from './recurring.reminders'

export interface RecurringOverviewSnapshot {
  taskCount: number
  pendingPeriodCount: number
  overduePeriodCount: number
  progressEntryCount: number
}

export function buildRecurringOverview(
  tasks: RecurringTask[],
  periodsByTaskId: Record<string, RecurringPeriod[]>,
  entriesByPeriodId: Record<string, RecurringProgressEntry[]>,
  nowIso: string,
): RecurringOverviewSnapshot {
  const reminderSnapshot = deriveRecurringReminderSnapshot(tasks, periodsByTaskId, entriesByPeriodId, nowIso)
  const progressEntryCount = Object.values(entriesByPeriodId).reduce((count, entries) => count + entries.length, 0)

  return {
    taskCount: tasks.length,
    pendingPeriodCount: reminderSnapshot.pending.length,
    overduePeriodCount: reminderSnapshot.overdue.length,
    progressEntryCount,
  }
}
