import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { buildTaskOverview } from './task.overview'
import type { TaskItem } from './task.types'

const today = dayjs().format('YYYY-MM-DD')
const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD')

const seedTasks: TaskItem[] = [
  {
    id: 'urgent-open',
    title: '紧急任务',
    description: '',
    completed: false,
    groupId: null,
    dueAt: today,
    priority: 'urgent',
    createdAt: `${today}T08:00:00.000Z`,
    updatedAt: `${today}T08:00:00.000Z`,
  },
  {
    id: 'high-done',
    title: '已完成高优先级任务',
    description: '',
    completed: true,
    groupId: 'group-1',
    dueAt: yesterday,
    priority: 'high',
    createdAt: `${yesterday}T08:00:00.000Z`,
    updatedAt: `${today}T09:00:00.000Z`,
  },
  {
    id: 'medium-open',
    title: '普通任务',
    description: '',
    completed: false,
    groupId: 'group-1',
    dueAt: dayjs().add(2, 'day').format('YYYY-MM-DD'),
    priority: 'medium',
    createdAt: `${today}T10:00:00.000Z`,
    updatedAt: `${today}T10:00:00.000Z`,
  },
]

describe('buildTaskOverview', () => {
  it('builds priority distribution and weekly summary', () => {
    const result = buildTaskOverview(seedTasks)

    expect(result.priorityBreakdown.urgent.count).toBe(1)
    expect(result.priorityBreakdown.high.count).toBe(1)
    expect(result.weeklySummary.completed).toBeGreaterThanOrEqual(1)
    expect(result.weeklySummary.highestOpenPriority).toBe('urgent')
    expect(result.trend).toHaveLength(7)
  })
})
