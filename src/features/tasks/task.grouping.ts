/**
 * 文件说明：统一封装任务排序后的前端分组逻辑，供任务列表视图复用。
 */
import dayjs from 'dayjs'
import type { TaskFilter, TaskItem } from './task.types'

export type TaskGroupKey = 'overdue' | 'today' | 'upcoming' | 'unscheduled' | 'completed'

export interface TaskGroup {
  key: TaskGroupKey
  title: string
  description: string
  tasks: TaskItem[]
}

const GROUP_META: Record<TaskGroupKey, Omit<TaskGroup, 'tasks'>> = {
  overdue: {
    key: 'overdue',
    title: '已逾期',
    description: '截止日期早于今天，建议优先处理。',
  },
  today: {
    key: 'today',
    title: '今天',
    description: '今天需要推进或完成的事项。',
  },
  upcoming: {
    key: 'upcoming',
    title: '未来',
    description: '已安排在后续日期的任务。',
  },
  unscheduled: {
    key: 'unscheduled',
    title: '未安排',
    description: '还没有设置明确截止日期。',
  },
  completed: {
    key: 'completed',
    title: '已完成',
    description: '本轮已经收尾的任务记录。',
  },
}

function resolveGroupKey(task: TaskItem): TaskGroupKey {
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

/**
 * 基于当前过滤视图生成任务分组。
 */
export function buildTaskGroups(tasks: TaskItem[], filter: TaskFilter): TaskGroup[] {
  if (filter === 'completed') {
    return tasks.length === 0 ? [] : [{ ...GROUP_META.completed, tasks }]
  }

  const groupOrder: TaskGroupKey[] = ['overdue', 'today', 'upcoming', 'unscheduled']
  const groupedTasks = new Map<TaskGroupKey, TaskItem[]>()

  tasks.forEach((task) => {
    const groupKey = resolveGroupKey(task)
    if (!groupedTasks.has(groupKey)) {
      groupedTasks.set(groupKey, [])
    }

    groupedTasks.get(groupKey)!.push(task)
  })

  if (filter === 'all') {
    const completedTasks = groupedTasks.get('completed')
    if (completedTasks?.length) {
      groupOrder.push('completed')
    }
  }

  return groupOrder
    .map((groupKey) => {
      const groupTasks = groupedTasks.get(groupKey) ?? []
      if (groupTasks.length === 0) {
        return null
      }

      return {
        ...GROUP_META[groupKey],
        tasks: groupTasks,
      }
    })
    .filter((group): group is TaskGroup => group !== null)
}
