// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ReminderItem, TaskItem } from '../features/tasks/task.types'
import { TaskReminderCenter } from './TaskReminderCenter'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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
  it('shows the entry badge count from pending reminders only', () => {
    const markup = renderToStaticMarkup(
      <TaskReminderCenter
        buckets={{
          overdue: [buildReminderItem()],
          upcoming: [],
          focusWithoutDate: [],
          recentlyReminded: [
            buildReminderItem({
              reason: 'recently-reminded',
              dueLabel: '刚提醒过',
              task: buildTask({ id: 'task-2', title: '跟进客户回执' }),
            }),
          ],
        }}
        isOpen={false}
        onOpenChange={vi.fn()}
        onSelectTask={vi.fn()}
      />,
    )

    expect(markup).toContain('icon-button-badge')
    expect(markup).toContain('>1<')
    expect(markup).not.toContain('>2<')
  })

  it('uses a recently-reminded summary instead of showing zero reminders with a real list', () => {
    const markup = renderToStaticMarkup(
      <TaskReminderCenter
        buckets={{
          overdue: [],
          upcoming: [],
          focusWithoutDate: [],
          recentlyReminded: [
            buildReminderItem({
              reason: 'recently-reminded',
              dueLabel: '刚提醒过',
              task: buildTask({ id: 'task-2', title: '跟进客户回执' }),
            }),
          ],
        }}
        isOpen
        onOpenChange={vi.fn()}
        onSelectTask={vi.fn()}
      />,
    )

    expect(markup).toContain('跟进客户回执')
    expect(markup).toContain('1')
    expect(markup).not.toContain('0 条提醒')
    expect(markup).not.toContain('当前没有提醒内容')
  })

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
        onSelectTask={vi.fn()}
      />,
    )

    expect(markup).toContain('提醒中心')
    expect(markup).toContain('已逾期')
    expect(markup).toContain('补齐验收清单')
  })

  it('renders reminder due labels as console chips instead of legacy priority badges', () => {
    const markup = renderToStaticMarkup(
      <TaskReminderCenter
        buckets={{
          overdue: [buildReminderItem()],
          upcoming: [],
          focusWithoutDate: [],
          recentlyReminded: [],
        }}
        isOpen
        onOpenChange={vi.fn()}
        onSelectTask={vi.fn()}
      />,
    )

    expect(markup).toContain('task-console-chip')
    expect(markup).toContain('is-priority')
    expect(markup).not.toContain('priority-badge')
  })

  it('queues reminder navigation through the selected task callback when an item is clicked', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const onOpenChange = vi.fn()
    const onSelectTask = vi.fn()

    await act(async () => {
      root.render(
        <TaskReminderCenter
          buckets={{
            overdue: [buildReminderItem()],
            upcoming: [],
            focusWithoutDate: [],
            recentlyReminded: [],
          }}
          isOpen
          onOpenChange={onOpenChange}
          onSelectTask={onSelectTask}
        />,
      )
    })

    const reminderButton = container.querySelector('.task-reminder-item')
    reminderButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    expect(onSelectTask).toHaveBeenCalledWith('task-1')
    expect(onOpenChange).toHaveBeenCalledWith(false)

    await act(async () => {
      root.unmount()
    })
    container.remove()
  })
})
