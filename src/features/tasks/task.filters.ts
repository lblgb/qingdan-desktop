/**
 * 文件说明：封装更多条件、排序方式与筛选摘要的统一逻辑。
 */
import dayjs from 'dayjs'
import type {
  TaskDateRangeFilter,
  TaskFilter,
  TaskGroup,
  TaskGroupFilter,
  TaskItem,
  TaskPriorityFilter,
  TaskQueryInput,
  TaskSortBy,
} from './task.types'
import { TASK_PRIORITY_META } from './task.priority'

export const DEFAULT_TASK_QUERY: TaskQueryInput = {
  status: 'all',
  group: 'all-groups',
  priority: 'all-priorities',
  dateRange: 'all-time',
  sortBy: 'default',
}

function priorityWeight(priority: TaskItem['priority']) {
  return TASK_PRIORITY_META[priority].weight
}

function compareByDefault(left: TaskItem, right: TaskItem) {
  const leftHasDueAt = !left.completed && left.dueAt ? 0 : 1
  const rightHasDueAt = !right.completed && right.dueAt ? 0 : 1

  if (left.completed !== right.completed) {
    return Number(left.completed) - Number(right.completed)
  }

  if (leftHasDueAt !== rightHasDueAt) {
    return leftHasDueAt - rightHasDueAt
  }

  if (left.dueAt !== right.dueAt) {
    return (left.dueAt ?? '').localeCompare(right.dueAt ?? '')
  }

  return right.updatedAt.localeCompare(left.updatedAt)
}

function compareByDueDate(left: TaskItem, right: TaskItem) {
  if (left.completed !== right.completed) {
    return Number(left.completed) - Number(right.completed)
  }

  const leftHasDueAt = left.dueAt ? 0 : 1
  const rightHasDueAt = right.dueAt ? 0 : 1
  if (leftHasDueAt !== rightHasDueAt) {
    return leftHasDueAt - rightHasDueAt
  }

  if (left.dueAt !== right.dueAt) {
    return (left.dueAt ?? '').localeCompare(right.dueAt ?? '')
  }

  return right.updatedAt.localeCompare(left.updatedAt)
}

function compareByPriority(left: TaskItem, right: TaskItem) {
  if (left.completed !== right.completed) {
    return Number(left.completed) - Number(right.completed)
  }

  const priorityResult = priorityWeight(left.priority) - priorityWeight(right.priority)
  if (priorityResult !== 0) {
    return priorityResult
  }

  return compareByDueDate(left, right)
}

function compareByUpdated(left: TaskItem, right: TaskItem) {
  return right.updatedAt.localeCompare(left.updatedAt)
}

function applyStatusFilter(tasks: TaskItem[], status: TaskFilter) {
  if (status === 'active') {
    return tasks.filter((task) => !task.completed)
  }

  if (status === 'completed') {
    return tasks.filter((task) => task.completed)
  }

  return tasks
}

function applyGroupFilter(tasks: TaskItem[], group: TaskGroupFilter) {
  if (group === 'all-groups') {
    return tasks
  }

  if (group === 'ungrouped') {
    return tasks.filter((task) => !task.groupId)
  }

  return tasks.filter((task) => task.groupId === group)
}

function applyPriorityFilter(tasks: TaskItem[], priority: TaskPriorityFilter) {
  if (priority === 'all-priorities') {
    return tasks
  }

  return tasks.filter((task) => task.priority === priority)
}

function applyDateRangeFilter(tasks: TaskItem[], dateRange: TaskDateRangeFilter) {
  if (dateRange === 'all-time') {
    return tasks
  }

  const today = dayjs().startOf('day')

  return tasks.filter((task) => {
    if (dateRange === 'no-date') {
      return !task.dueAt
    }

    if (!task.dueAt) {
      return false
    }

    const dueAt = dayjs(task.dueAt)
    const diffDays = dueAt.startOf('day').diff(today, 'day')

    if (dateRange === 'today') {
      return diffDays === 0
    }

    if (dateRange === 'upcoming') {
      return diffDays > 0 && diffDays <= 7
    }

    if (dateRange === 'overdue') {
      return diffDays < 0
    }

    return true
  })
}

function sortTasks(tasks: TaskItem[], sortBy: TaskSortBy) {
  const nextTasks = [...tasks]

  switch (sortBy) {
    case 'due-date':
      return nextTasks.sort(compareByDueDate)
    case 'priority':
      return nextTasks.sort(compareByPriority)
    case 'updated':
      return nextTasks.sort(compareByUpdated)
    case 'default':
    default:
      return nextTasks.sort(compareByDefault)
  }
}

export function applyTaskQuery(tasks: TaskItem[], query: TaskQueryInput) {
  const statusFiltered = applyStatusFilter(tasks, query.status)
  const groupFiltered = applyGroupFilter(statusFiltered, query.group)
  const priorityFiltered = applyPriorityFilter(groupFiltered, query.priority)
  const dateFiltered = applyDateRangeFilter(priorityFiltered, query.dateRange)

  return sortTasks(dateFiltered, query.sortBy)
}

function groupSummary(group: TaskGroupFilter, taskGroups: TaskGroup[]) {
  if (group === 'all-groups') {
    return null
  }

  if (group === 'ungrouped') {
    return '未分组'
  }

  return taskGroups.find((item) => item.id === group)?.name ?? '未知任务组'
}

function prioritySummary(priority: TaskPriorityFilter) {
  if (priority === 'all-priorities') {
    return null
  }

  return TASK_PRIORITY_META[priority].label
}

function dateRangeSummary(dateRange: TaskDateRangeFilter) {
  switch (dateRange) {
    case 'today':
      return '今天'
    case 'upcoming':
      return '未来 7 天'
    case 'overdue':
      return '已逾期'
    case 'no-date':
      return '无日期'
    default:
      return null
  }
}

function sortSummary(sortBy: TaskSortBy) {
  switch (sortBy) {
    case 'due-date':
      return '截止日期优先'
    case 'priority':
      return '优先级优先'
    case 'updated':
      return '最近更新'
    default:
      return '默认推荐'
  }
}

export function summarizeFilters(query: TaskQueryInput, taskGroups: TaskGroup[] = []) {
  const summaryParts = [
    groupSummary(query.group, taskGroups),
    prioritySummary(query.priority),
    dateRangeSummary(query.dateRange),
    sortSummary(query.sortBy),
  ].filter(Boolean)

  return summaryParts.length > 0 ? summaryParts.join(' / ') : '默认推荐'
}
