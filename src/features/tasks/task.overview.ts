/**
 * 文件说明：集中生成任务概览所需的派生统计数据，供概览弹窗和后续图表扩展复用。
 */
import dayjs from 'dayjs'
import { TASK_PRIORITY_META } from './task.priority'
import { getTaskQualityWarnings, TASK_QUALITY_WARNINGS } from './task.quality'
import type { TaskGroup, TaskItem, TaskPriority } from './task.types'

export type TaskDueBucketKey = 'overdue' | 'today' | 'upcoming' | 'unscheduled' | 'completed'

export interface TaskDueBucket {
  key: TaskDueBucketKey
  label: string
  hint: string
  count: number
}

export interface OverviewTotals {
  total: number
  active: number
  completed: number
  overdue: number
  dueToday: number
  completionRate: number
}

export interface TaskTrendItem {
  date: string
  created: number
  completed: number
}

export interface WeeklySummary {
  created: number
  completed: number
  overdueDelta: number
  highestOpenPriority: TaskPriority | null
}

export interface ReviewSnapshot {
  recentCompleted: TaskItem[]
  monthlyTrend: Array<{ label: string; completed: number }>
  weekly: {
    completed: number
    archived: number
    highestPriorityCompleted: number
    overdueOpen: number
  }
  quality: {
    shortTitleCount: number
    duplicateTitleCount: number
    highPriorityWithoutNoteCount: number
  }
}

export interface TaskOverviewSnapshot {
  totals: OverviewTotals
  priorityBreakdown: Record<TaskPriority, { count: number; ratio: number }>
  dueBuckets: TaskDueBucket[]
  trend: TaskTrendItem[]
  weeklySummary: WeeklySummary
  review: ReviewSnapshot
}

const DUE_BUCKET_META: Record<TaskDueBucketKey, Omit<TaskDueBucket, 'count'>> = {
  overdue: {
    key: 'overdue',
    label: '已逾期',
    hint: '截止日期早于今天的未完成任务',
  },
  today: {
    key: 'today',
    label: '今天',
    hint: '今天需要推进或完成的任务',
  },
  upcoming: {
    key: 'upcoming',
    label: '未来',
    hint: '已经排到后续日期的任务',
  },
  unscheduled: {
    key: 'unscheduled',
    label: '未安排',
    hint: '尚未设置截止日期的任务',
  },
  completed: {
    key: 'completed',
    label: '已完成',
    hint: '已经收尾并沉底的任务',
  },
}

function getDueBucketKey(task: TaskItem): TaskDueBucketKey {
  if (task.completed) {
    return 'completed'
  }

  if (!task.dueAt) {
    return 'unscheduled'
  }

  const today = dayjs().startOf('day')
  const dueDate = dayjs(task.dueAt).startOf('day')

  if (dueDate.isBefore(today)) {
    return 'overdue'
  }

  if (dueDate.isSame(today)) {
    return 'today'
  }

  return 'upcoming'
}

function toPercent(value: number, total: number) {
  if (total <= 0) {
    return 0
  }

  return Math.round((value / total) * 100)
}

function isWithinRecentDays(value: string | null, days: number) {
  if (!value) {
    return false
  }

  const today = dayjs().startOf('day')
  const rangeStart = today.subtract(days - 1, 'day')
  const date = dayjs(value).startOf('day')

  return !date.isBefore(rangeStart) && !date.isAfter(today)
}

function buildPriorityBreakdown(tasks: TaskItem[]) {
  const total = tasks.length

  return (Object.keys(TASK_PRIORITY_META) as TaskPriority[]).reduce<
    Record<TaskPriority, { count: number; ratio: number }>
  >((result, priority) => {
    const count = tasks.filter((task) => task.priority === priority).length
    result[priority] = {
      count,
      ratio: toPercent(count, total),
    }
    return result
  }, {} as Record<TaskPriority, { count: number; ratio: number }>)
}

function buildTrend(tasks: TaskItem[]) {
  const today = dayjs().startOf('day')

  return Array.from({ length: 7 }, (_, index) => {
    const date = today.subtract(6 - index, 'day')
    const dateKey = date.format('YYYY-MM-DD')

    return {
      date: dateKey,
      created: tasks.filter((task) => dayjs(task.createdAt).format('YYYY-MM-DD') === dateKey).length,
      completed: tasks.filter(
        (task) => task.completed && task.completedAt && dayjs(task.completedAt).format('YYYY-MM-DD') === dateKey,
      ).length,
    }
  })
}

function buildWeeklySummary(tasks: TaskItem[]) {
  const today = dayjs().startOf('day')
  const weekStart = today.subtract(6, 'day')

  const created = tasks.filter((task) => !dayjs(task.createdAt).startOf('day').isBefore(weekStart)).length
  const completed = tasks.filter(
    (task) => task.completed && task.completedAt && !dayjs(task.completedAt).startOf('day').isBefore(weekStart),
  ).length

  const overdueNow = tasks.filter((task) => getDueBucketKey(task) === 'overdue').length
  const overdueAtWeekStart = tasks.filter((task) => {
    if (!task.dueAt) {
      return false
    }

    const dueDate = dayjs(task.dueAt).startOf('day')
    const wasCompletedBeforeWeekStart =
      task.completed && task.completedAt && dayjs(task.completedAt).startOf('day').isBefore(weekStart)

    return dueDate.isBefore(weekStart) && !wasCompletedBeforeWeekStart
  }).length

  const highestOpenPriority =
    [...tasks]
      .filter((task) => !task.completed)
      .sort((left, right) => TASK_PRIORITY_META[left.priority].weight - TASK_PRIORITY_META[right.priority].weight)[0]
      ?.priority ?? null

  return {
    created,
    completed,
    overdueDelta: overdueNow - overdueAtWeekStart,
    highestOpenPriority,
  }
}

function buildReviewSnapshot(tasks: TaskItem[]): ReviewSnapshot {
  const recentCompleted = [...tasks]
    .filter((task) => task.completed && task.completedAt)
    .sort((left, right) => dayjs(right.completedAt).valueOf() - dayjs(left.completedAt).valueOf())
    .slice(0, 10)

  const monthlyTrend = Array.from({ length: 6 }, (_, index) => {
    const month = dayjs().startOf('month').subtract(5 - index, 'month')
    const label = month.format('YYYY-MM')

    return {
      label,
      completed: tasks.filter(
        (task) => task.completed && task.completedAt && dayjs(task.completedAt).format('YYYY-MM') === label,
      ).length,
    }
  })

  const weekly = {
    completed: tasks.filter((task) => task.completed && isWithinRecentDays(task.completedAt, 7)).length,
    archived: tasks.filter((task) => isWithinRecentDays(task.archivedAt, 7)).length,
    highestPriorityCompleted: tasks.filter(
      (task) =>
        task.completed &&
        isWithinRecentDays(task.completedAt, 7) &&
        (task.priority === 'urgent' || task.priority === 'high'),
    ).length,
    overdueOpen: tasks.filter((task) => {
      if (task.completed || task.archivedAt || !task.dueAt) {
        return false
      }

      return dayjs(task.dueAt).startOf('day').isBefore(dayjs().startOf('day'))
    }).length,
  }

  const quality = tasks.reduce<ReviewSnapshot['quality']>(
    (result, task) => {
      const warnings = getTaskQualityWarnings(task, tasks)

      if (warnings.includes(TASK_QUALITY_WARNINGS.shortTitle)) {
        result.shortTitleCount += 1
      }

      if (warnings.includes(TASK_QUALITY_WARNINGS.duplicateTitle)) {
        result.duplicateTitleCount += 1
      }

      if (warnings.includes(TASK_QUALITY_WARNINGS.highPriorityWithoutNote)) {
        result.highPriorityWithoutNoteCount += 1
      }

      return result
    },
    {
      shortTitleCount: 0,
      duplicateTitleCount: 0,
      highPriorityWithoutNoteCount: 0,
    },
  )

  return {
    recentCompleted,
    monthlyTrend,
    weekly,
    quality,
  }
}

/**
 * 生成概览快照。
 */
export function buildTaskOverview(tasks: TaskItem[], _taskGroups: TaskGroup[] = []): TaskOverviewSnapshot {
  const dueBucketCounts: Record<TaskDueBucketKey, number> = {
    overdue: 0,
    today: 0,
    upcoming: 0,
    unscheduled: 0,
    completed: 0,
  }

  tasks.forEach((task) => {
    dueBucketCounts[getDueBucketKey(task)] += 1
  })

  const total = tasks.length
  const completed = tasks.filter((task) => task.completed).length
  const active = total - completed
  const overdue = dueBucketCounts.overdue
  const dueToday = dueBucketCounts.today

  const dueBuckets = (Object.keys(DUE_BUCKET_META) as TaskDueBucketKey[]).map((key) => ({
    ...DUE_BUCKET_META[key],
    count: dueBucketCounts[key],
  }))

  return {
    totals: {
      total,
      active,
      completed,
      overdue,
      dueToday,
      completionRate: toPercent(completed, total),
    },
    priorityBreakdown: buildPriorityBreakdown(tasks),
    dueBuckets,
    trend: buildTrend(tasks),
    weeklySummary: buildWeeklySummary(tasks),
    review: buildReviewSnapshot(tasks),
  }
}
