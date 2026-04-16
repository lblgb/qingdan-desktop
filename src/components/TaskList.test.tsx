// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskList } from './TaskList'
import { useTaskStore } from '../stores/taskStore'
import type { TaskItem } from '../features/tasks/task.types'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function buildTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'task-1',
    title: '准备周报',
    description: '',
    completed: false,
    groupId: null,
    dueAt: null,
    priority: 'medium',
    createdAt: '2026-04-16T08:00:00.000Z',
    updatedAt: '2026-04-16T08:00:00.000Z',
    ...overrides,
  }
}

describe('TaskList reminder navigation', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    useTaskStore.setState({
      tasks: [
        buildTask({ id: 'task-1', title: '任务一' }),
        buildTask({ id: 'task-2', title: '任务二' }),
      ],
      filteredTasks: [
        buildTask({ id: 'task-1', title: '任务一' }),
        buildTask({ id: 'task-2', title: '任务二' }),
      ],
      activeFilter: 'all',
      activeGroupFilter: 'all-groups',
      activePriorityFilter: 'all-priorities',
      activeDateRange: 'all-time',
      activeSortBy: 'default',
      taskGroups: [],
      reminderNavigation: null,
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.restoreAllMocks()
  })

  it('scrolls the requested reminder target into view, highlights it, and clears the queued navigation', async () => {
    vi.useFakeTimers()
    const scrollIntoView = vi.fn()

    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    useTaskStore.getState().queueReminderNavigation('task-2')

    await act(async () => {
      root.render(<TaskList />)
    })

    const target = container.querySelector('[data-task-id="task-2"]')
    expect(target).not.toBeNull()
    expect(target?.className).toContain('reminder-target')
    expect(scrollIntoView).toHaveBeenCalled()
    expect(useTaskStore.getState().reminderNavigation?.taskId).toBe('task-2')

    await act(async () => {
      vi.advanceTimersByTime(2_000)
    })

    expect(useTaskStore.getState().reminderNavigation).toBeNull()
    expect(target?.className).not.toContain('reminder-target')
  })
})
