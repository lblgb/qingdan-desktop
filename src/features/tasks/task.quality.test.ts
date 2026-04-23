import { describe, expect, it } from 'vitest'
import type { TaskItem } from './task.types'
import { getTaskQualityWarnings } from './task.quality'

function buildTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'task-1',
    title: '准备周报',
    description: '',
    note: '',
    completed: false,
    completedAt: null,
    archivedAt: null,
    groupId: null,
    dueAt: null,
    priority: 'medium',
    createdAt: '2026-04-16T08:00:00.000Z',
    updatedAt: '2026-04-16T08:00:00.000Z',
    ...overrides,
  }
}

describe('getTaskQualityWarnings', () => {
  it('warns when title length is between one and three characters', () => {
    const task = buildTask({ title: '复盘' })

    expect(getTaskQualityWarnings(task, [task])).toContain('标题较短，后续可能不易回忆任务背景。')
  })

  it('warns when another task has the same trimmed title', () => {
    const task = buildTask({ id: 'task-1', title: ' 准备周报 ' })
    const duplicate = buildTask({ id: 'task-2', title: '准备周报' })

    expect(getTaskQualityWarnings(task, [task, duplicate])).toContain('存在标题相同的任务，建议确认是否重复。')
  })

  it('warns when an urgent or high priority task has no note', () => {
    const task = buildTask({ priority: 'urgent', note: '   ' })

    expect(getTaskQualityWarnings(task, [task])).toContain('高优先级任务建议补充备注，方便回看处理背景。')
  })
})
