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

describe('TaskList reminder navigation', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const originalOpenTaskDetail = useTaskStore.getState().openTaskDetail
  const originalApplyBulkArchive = useTaskStore.getState().applyBulkArchive

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
      isBulkMode: false,
      selectedTaskIds: [],
      isMutating: false,
      activeAction: null,
      openTaskDetail: originalOpenTaskDetail,
      applyBulkArchive: originalApplyBulkArchive,
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    vi.restoreAllMocks()
  })

  it('opens the selected task detail from the list action', async () => {
    const openTaskDetail = vi.fn()
    useTaskStore.setState({ openTaskDetail })

    await act(async () => {
      root.render(<TaskList />)
    })

    const detailButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '详情')
    expect(detailButton).toBeTruthy()

    await act(async () => {
      detailButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(openTaskDetail).toHaveBeenCalledWith('task-1')
  })

  it('disables bulk archive when selection contains active tasks', async () => {
    const completedTask = buildTask({ id: 'task-1', title: '已完成任务', completed: true })
    const activeTask = buildTask({ id: 'task-2', title: '进行中任务', completed: false })

    useTaskStore.setState({
      tasks: [completedTask, activeTask],
      filteredTasks: [completedTask, activeTask],
      isBulkMode: true,
      selectedTaskIds: ['task-1', 'task-2'],
    })

    await act(async () => {
      root.render(<TaskList />)
    })

    const archiveButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '批量归档')
    expect(archiveButton).toBeInstanceOf(HTMLButtonElement)
    expect((archiveButton as HTMLButtonElement).disabled).toBe(true)
    expect((archiveButton as HTMLButtonElement).title).toBe('仅已完成任务可归档')
  })

  it('mentions archive in the bulk toolbar helper text', async () => {
    const completedTask = buildTask({ id: 'task-1', title: '已完成任务', completed: true })

    useTaskStore.setState({
      tasks: [completedTask],
      filteredTasks: [completedTask],
      isBulkMode: true,
      selectedTaskIds: ['task-1'],
    })

    await act(async () => {
      root.render(<TaskList />)
    })

    const helperText = container.querySelector('.bulk-toolbar-main .section-note')?.textContent
    expect(helperText).toContain('归档')
  })

  it('renders console module cards with status chips for task rows', async () => {
    const completedTask = buildTask({ id: 'task-1', title: 'done task', completed: true, priority: 'high' })
    const activeTask = buildTask({ id: 'task-2', title: 'active task', completed: false, priority: 'urgent' })

    useTaskStore.setState({
      tasks: [completedTask, activeTask],
      filteredTasks: [completedTask, activeTask],
    })

    await act(async () => {
      root.render(<TaskList />)
    })

    const moduleCards = container.querySelectorAll('.task-module-card')
    expect(moduleCards).toHaveLength(2)

    const stateChips = container.querySelectorAll('.task-state-chip')
    expect(stateChips).toHaveLength(2)
    expect(container.querySelector('.task-state-chip.is-done')).toBeTruthy()
    expect(container.querySelector('.task-state-chip.is-active')).toBeTruthy()
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
