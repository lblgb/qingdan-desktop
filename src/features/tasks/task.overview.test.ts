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
    note: '',
    completed: false,
    completedAt: null,
    archivedAt: null,
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
    note: '',
    completed: true,
    completedAt: `${today}T09:00:00.000Z`,
    archivedAt: null,
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
    note: '',
    completed: false,
    completedAt: null,
    archivedAt: null,
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

  it('builds review snapshot from completion, archive, overdue, and quality signals', () => {
    const thisMonth = dayjs()
    const lastMonth = dayjs().subtract(1, 'month')
    const staleCompletedAt = dayjs().subtract(10, 'day').format('YYYY-MM-DD')
    const recentCompletedAt = dayjs().subtract(2, 'day').format('YYYY-MM-DD')
    const archivedAt = dayjs().subtract(3, 'day').format('YYYY-MM-DD')
    const overdueAt = dayjs().subtract(1, 'day').format('YYYY-MM-DD')

    const tasks: TaskItem[] = [
      {
        id: 'updated-only',
        title: '仅更新不算本周完成',
        description: '',
        note: '有完成时间但不在本周',
        completed: true,
        completedAt: `${staleCompletedAt}T08:00:00.000Z`,
        archivedAt: null,
        groupId: null,
        dueAt: null,
        priority: 'medium',
        createdAt: `${staleCompletedAt}T07:00:00.000Z`,
        updatedAt: `${today}T08:00:00.000Z`,
      },
      {
        id: 'recent-high',
        title: '最近高优先级完成',
        description: '',
        note: '',
        completed: true,
        completedAt: `${recentCompletedAt}T10:00:00.000Z`,
        archivedAt: null,
        groupId: null,
        dueAt: null,
        priority: 'high',
        createdAt: `${recentCompletedAt}T08:00:00.000Z`,
        updatedAt: `${recentCompletedAt}T10:00:00.000Z`,
      },
      {
        id: 'archived-completed',
        title: '已归档完成项',
        description: '',
        note: '归档也要进入完成统计',
        completed: true,
        completedAt: `${today}T11:00:00.000Z`,
        archivedAt: `${archivedAt}T12:00:00.000Z`,
        groupId: null,
        dueAt: null,
        priority: 'urgent',
        createdAt: `${today}T08:00:00.000Z`,
        updatedAt: `${today}T12:00:00.000Z`,
      },
      {
        id: 'last-month-completed',
        title: '上月完成项',
        description: '',
        note: '',
        completed: true,
        completedAt: `${lastMonth.format('YYYY-MM-DD')}T09:00:00.000Z`,
        archivedAt: null,
        groupId: null,
        dueAt: null,
        priority: 'low',
        createdAt: `${lastMonth.format('YYYY-MM-DD')}T08:00:00.000Z`,
        updatedAt: `${lastMonth.format('YYYY-MM-DD')}T09:00:00.000Z`,
      },
      {
        id: 'overdue-open',
        title: '开口逾期',
        description: '',
        note: '',
        completed: false,
        completedAt: null,
        archivedAt: null,
        groupId: null,
        dueAt: overdueAt,
        priority: 'medium',
        createdAt: `${overdueAt}T08:00:00.000Z`,
        updatedAt: `${overdueAt}T08:00:00.000Z`,
      },
      {
        id: 'archived-overdue-open',
        title: '归档逾期不算开口',
        description: '',
        note: '',
        completed: false,
        completedAt: null,
        archivedAt: `${today}T08:00:00.000Z`,
        groupId: null,
        dueAt: overdueAt,
        priority: 'medium',
        createdAt: `${overdueAt}T08:00:00.000Z`,
        updatedAt: `${today}T08:00:00.000Z`,
      },
      {
        id: 'short-title',
        title: '短',
        description: '',
        note: '',
        completed: false,
        completedAt: null,
        archivedAt: null,
        groupId: null,
        dueAt: null,
        priority: 'low',
        createdAt: `${today}T08:00:00.000Z`,
        updatedAt: `${today}T08:00:00.000Z`,
      },
      {
        id: 'duplicate-a',
        title: '重复任务',
        description: '',
        note: '',
        completed: false,
        completedAt: null,
        archivedAt: null,
        groupId: null,
        dueAt: null,
        priority: 'low',
        createdAt: `${today}T08:00:00.000Z`,
        updatedAt: `${today}T08:00:00.000Z`,
      },
      {
        id: 'duplicate-b',
        title: '重复任务',
        description: '',
        note: '',
        completed: false,
        completedAt: null,
        archivedAt: null,
        groupId: null,
        dueAt: null,
        priority: 'low',
        createdAt: `${today}T08:00:00.000Z`,
        updatedAt: `${today}T08:00:00.000Z`,
      },
    ]

    const result = buildTaskOverview([
      ...tasks,
      ...Array.from({ length: 11 }, (_, index): TaskItem => ({
        id: `recent-extra-${index}`,
        title: `最近完成 ${index}`,
        description: '',
        note: '用于验证最近完成只取前十',
        completed: true,
        completedAt: `${today}T${String(index).padStart(2, '0')}:00:00.000Z`,
        archivedAt: null,
        groupId: null,
        dueAt: null,
        priority: 'medium',
        createdAt: `${today}T00:00:00.000Z`,
        updatedAt: `${today}T${String(index).padStart(2, '0')}:00:00.000Z`,
      })),
    ])

    expect(result.review.weekly.completed).toBe(13)
    expect(result.review.weekly.archived).toBe(2)
    expect(result.review.weekly.highestPriorityCompleted).toBe(2)
    expect(result.review.weekly.overdueOpen).toBe(1)
    expect(result.review.recentCompleted).toHaveLength(10)
    expect(result.review.recentCompleted[0].id).toBe('archived-completed')
    expect(result.review.recentCompleted).not.toContainEqual(expect.objectContaining({ id: 'updated-only' }))
    expect(result.review.monthlyTrend).toEqual(
      expect.arrayContaining([
        { label: thisMonth.format('YYYY-MM'), completed: 14 },
        { label: lastMonth.format('YYYY-MM'), completed: 1 },
      ]),
    )
    expect(result.review.quality).toEqual({
      shortTitleCount: 1,
      duplicateTitleCount: 2,
      highPriorityWithoutNoteCount: 1,
    })
  })
})
