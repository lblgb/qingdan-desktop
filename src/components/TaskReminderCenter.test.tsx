import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ReminderItem, TaskItem } from '../features/tasks/task.types'
import { TaskReminderCenter } from './TaskReminderCenter'

function buildTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'task-1',
    title: '准备周报',
    description: '',
    completed: false,
    groupId: null,
    dueAt: null,
    priority: 'high',
    createdAt: '2026-04-16T08:00:00.000Z',
    updatedAt: '2026-04-16T08:00:00.000Z',
    ...overrides,
  }
}

function buildReminderItem(overrides: Partial<ReminderItem> = {}): ReminderItem {
  return {
    task: buildTask(),
    reason: 'overdue',
    dueLabel: '已逾期',
    ...overrides,
  }
}

describe('TaskReminderCenter', () => {
  it('renders grouped reminder sections when dialog is open', () => {
    const markup = renderToStaticMarkup(
      <TaskReminderCenter
        buckets={{
          overdue: [buildReminderItem()],
          upcoming: [],
          focusWithoutDate: [
            buildReminderItem({
              reason: 'focus-without-date',
              dueLabel: '未设置日期',
              task: buildTask({ id: 'task-2', title: '补齐验收清单' }),
            }),
          ],
          recentlyReminded: [],
        }}
        isOpen
        onOpenChange={vi.fn()}
      />,
    )

    expect(markup).toContain('提醒中心')
    expect(markup).toContain('已逾期')
    expect(markup).toContain('高优先级未排期')
    expect(markup).toContain('补齐验收清单')
  })
})
