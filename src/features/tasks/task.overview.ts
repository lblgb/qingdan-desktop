/**
 * 文件说明：集中生成任务概览所需的派生统计数据，供概览弹窗和后续图表扩展复用。
 */
import dayjs from 'dayjs'
import type { TaskGroup, TaskItem } from './task.types'

export type TaskDueBucketKey = 'overdue' | 'today' | 'upcoming' | 'unscheduled' | 'completed'

export interface TaskDueBucket {
  key: TaskDueBucketKey
  label: string
  hint: string
  count: number
}

export interface TaskGroupOverviewItem {
  id: string | null
  label: string
  description: string
  total: number
  active: number
  completed: number
  overdue: number
  completionRate: number
  share: number
}

export interface TaskOverviewSnapshot {
  total: number
  active: number
  completed: number
  overdue: number
  dueToday: number
  completionRate: number
  dueBuckets: TaskDueBucket[]
  groupItems: TaskGroupOverviewItem[]
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

function buildGroupOverviewItem(
  tasks: TaskItem[],
  groupId: string | null,
  label: string,
  description: string,
  totalTaskCount: number,
): TaskGroupOverviewItem {
  const scopedTasks = tasks.filter((task) => task.groupId === groupId)
  const completed = scopedTasks.filter((task) => task.completed).length
  const active = scopedTasks.length - completed
  const overdue = scopedTasks.filter((task) => getDueBucketKey(task) === 'overdue').length

  return {
    id: groupId,
    label,
    description,
    total: scopedTasks.length,
    active,
    completed,
    overdue,
    completionRate: toPercent(completed, scopedTasks.length),
    share: toPercent(scopedTasks.length, totalTaskCount),
  }
}

/**
 * 生成概览快照。
 */
export function buildTaskOverview(tasks: TaskItem[], taskGroups: TaskGroup[]): TaskOverviewSnapshot {
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

  const groupItems = [
    ...taskGroups.map((group) => buildGroupOverviewItem(tasks, group.id, group.name, group.description, total)),
    buildGroupOverviewItem(tasks, null, '未分组', '还未归到任何任务组的任务', total),
  ]
    .filter((item) => item.total > 0)
    .sort((left, right) => {
      if (right.total !== left.total) {
        return right.total - left.total
      }

      return left.label.localeCompare(right.label, 'zh-CN')
    })

  return {
    total,
    active,
    completed,
    overdue,
    dueToday,
    completionRate: toPercent(completed, total),
    dueBuckets,
    groupItems,
  }
}
