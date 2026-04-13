import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { applyTaskQuery, summarizeFilters } from './task.filters'
import type { TaskItem } from './task.types'

const today = dayjs().format('YYYY-MM-DD')

const seedTasks: TaskItem[] = [
  {
    id: 'urgent-today',
    title: '紧急任务',
    description: '',
    completed: false,
    groupId: null,
    dueAt: today,
    priority: 'urgent',
    createdAt: '2026-04-10T08:00:00.000Z',
    updatedAt: '2026-04-10T09:00:00.000Z',
  },
  {
    id: 'high-done',
    title: '已完成高优先级任务',
    description: '',
    completed: true,
    groupId: 'group-1',
    dueAt: null,
    priority: 'high',
    createdAt: '2026-04-08T08:00:00.000Z',
    updatedAt: '2026-04-11T09:00:00.000Z',
  },
  {
    id: 'medium-upcoming',
    title: '普通任务',
    description: '',
    completed: false,
    groupId: 'group-1',
    dueAt: dayjs().add(6, 'day').format('YYYY-MM-DD'),
    priority: 'medium',
    createdAt: '2026-04-09T08:00:00.000Z',
    updatedAt: '2026-04-09T09:00:00.000Z',
  },
]

describe('summarizeFilters', () => {
  it('returns merged summary for group, priority, date range and sort', () => {
    expect(
      summarizeFilters(
        {
          status: 'all',
          group: 'ungrouped',
          priority: 'urgent',
          dateRange: 'today',
          sortBy: 'priority',
        },
        [],
      ),
    ).toContain('未分组')
  })
})

describe('applyTaskQuery', () => {
  it('applies status and extra conditions as intersection', () => {
    const result = applyTaskQuery(seedTasks, {
      status: 'active',
      group: 'ungrouped',
      priority: 'urgent',
      dateRange: 'today',
      sortBy: 'priority',
    })

    expect(result).toHaveLength(1)
    expect(result.every((task) => !task.completed)).toBe(true)
    expect(result.every((task) => task.priority === 'urgent')).toBe(true)
  })
})
