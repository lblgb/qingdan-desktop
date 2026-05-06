import dayjs from 'dayjs'
import type { RecurringPeriod, RecurringTask, RecurringTimeEntry } from './recurring.types'

export interface RecurringOverviewItem {
  task: RecurringTask
  currentPeriod: RecurringPeriod | null
  targetMinutes: number
  completedMinutes: number
  remainingMinutes: number
  completionRate: number
  isCompleted: boolean
  latestEntry: RecurringTimeEntry | null
}

export interface RecurringOverviewSnapshot {
  taskCount: number
  totalTargetMinutes: number
  totalCompletedMinutes: number
  totalRemainingMinutes: number
  completionRate: number
  completedTaskCount: number
  incompleteTaskCount: number
  items: RecurringOverviewItem[]
}

export function buildRecurringOverview(
  tasks: RecurringTask[],
  periodsByTaskId: Record<string, RecurringPeriod[]>,
  entriesByPeriodId: Record<string, RecurringTimeEntry[]>,
  nowIso: string,
): RecurringOverviewSnapshot {
  const now = dayjs(nowIso)
  const items = tasks.map((task) => {
    const currentPeriod =
      periodsByTaskId[task.id]?.find(
        (period) =>
          !dayjs(period.startAt).isAfter(now) &&
          dayjs(period.endAt).isAfter(now) &&
          (period.closedAt == null || dayjs(period.closedAt).isAfter(now)),
      ) ?? null
    const entries = currentPeriod ? entriesByPeriodId[currentPeriod.id] ?? [] : []
    const targetMinutes = currentPeriod ? task.targetMinutesPerPeriod : 0
    const completedMinutes = entries.reduce((total, entry) => total + entry.durationMinutes, 0)
    const remainingMinutes = Math.max(targetMinutes - completedMinutes, 0)
    const completionRate = targetMinutes > 0 ? Math.round((completedMinutes / targetMinutes) * 100) : 0
    const latestEntry =
      [...entries].sort(
        (left, right) =>
          right.startedAt.localeCompare(left.startedAt) || right.createdAt.localeCompare(left.createdAt),
      )[0] ?? null

    return {
      task,
      currentPeriod,
      targetMinutes,
      completedMinutes,
      remainingMinutes,
      completionRate,
      isCompleted: targetMinutes > 0 && completedMinutes >= targetMinutes,
      latestEntry,
    }
  })
  const totalTargetMinutes = items.reduce((total, item) => total + item.targetMinutes, 0)
  const totalCompletedMinutes = items.reduce((total, item) => total + item.completedMinutes, 0)
  const totalRemainingMinutes = items.reduce((total, item) => total + item.remainingMinutes, 0)
  const completedTaskCount = items.filter((item) => item.isCompleted).length

  return {
    taskCount: tasks.length,
    totalTargetMinutes,
    totalCompletedMinutes,
    totalRemainingMinutes,
    completionRate: totalTargetMinutes > 0 ? Math.round((totalCompletedMinutes / totalTargetMinutes) * 100) : 0,
    completedTaskCount,
    incompleteTaskCount: tasks.length - completedTaskCount,
    items,
  }
}
