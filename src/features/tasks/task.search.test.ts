import { describe, expect, it } from 'vitest'
import { searchTasks } from './task.search'
import type { TaskItem } from './task.types'

function buildTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'task-1',
    title: '测试任务',
    description: '',
    note: '',
    completed: false,
    completedAt: null,
    archivedAt: null,
    groupId: null,
    dueAt: null,
    priority: 'medium',
    createdAt: '2026-04-26T08:00:00.000Z',
    updatedAt: '2026-04-26T08:00:00.000Z',
    ...overrides,
  }
}

describe('searchTasks', () => {
  it('matches tasks by title and note', () => {
    const results = searchTasks(
      [
        buildTask({ id: 'a', title: '备份中心', note: '恢复入口' }),
        buildTask({ id: 'b', title: '列表优化', note: '控制台视觉' }),
      ],
      '恢复',
    )

    expect(results.map((item) => item.task.id)).toEqual(['a'])
    expect(results[0]?.matchedField).toBe('note')
  })

  it('prefers title matches over note matches', () => {
    const results = searchTasks(
      [
        buildTask({ id: 'a', title: '恢复入口', note: '别的内容', updatedAt: '2026-04-26T08:00:00.000Z' }),
        buildTask({ id: 'b', title: '备份中心', note: '恢复入口', updatedAt: '2026-04-26T09:00:00.000Z' }),
      ],
      '恢复',
    )

    expect(results.map((item) => item.task.id)).toEqual(['a', 'b'])
  })
})
