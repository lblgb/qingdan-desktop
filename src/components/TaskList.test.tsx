// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskList } from './TaskList'
import { TaskOverview } from './TaskOverview'
import { useTaskStore } from '../stores/taskStore'
import type { TaskGroup, TaskItem } from '../features/tasks/task.types'

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
    vi.useRealTimers()
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

  it('renders priority, group, due date, and status as one unified console chip system', async () => {
    const taskGroup: TaskGroup = {
      id: 'group-1',
      name: 'Console Group',
      description: 'Console test group',
      createdAt: '2026-04-16T08:00:00.000Z',
      updatedAt: '2026-04-16T08:00:00.000Z',
    }

    useTaskStore.setState({
      tasks: [
        buildTask({
          id: 'task-1',
          title: 'chip task',
          completed: false,
          priority: 'urgent',
          groupId: 'group-1',
          dueAt: '2026-04-21T08:00:00.000Z',
        }),
      ],
      filteredTasks: [
        buildTask({
          id: 'task-1',
          title: 'chip task',
          completed: false,
          priority: 'urgent',
          groupId: 'group-1',
          dueAt: '2026-04-21T08:00:00.000Z',
        }),
      ],
      taskGroups: [taskGroup],
    })

    await act(async () => {
      root.render(<TaskList />)
    })

    const taskRow = container.querySelector('[data-task-id="task-1"]')
    expect(taskRow).toBeTruthy()
    expect(taskRow?.querySelector('.priority-badge')).toBeNull()

    const metaChips = Array.from(taskRow?.querySelectorAll('.task-meta > *') ?? [])
    expect(metaChips.length).toBeGreaterThanOrEqual(3)
    expect(metaChips.every((chip) => chip.classList.contains('task-console-chip'))).toBe(true)

    const headerChips = Array.from(taskRow?.querySelectorAll('.task-tag-row .task-console-chip') ?? [])
    expect(headerChips.length).toBe(2)
  })

  it('renders overview panels with console chips and monthly trend bars', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-25T09:00:00.000Z'))

    const openTask = buildTask({
      id: 'task-open',
      title: 'Open urgent task',
      priority: 'urgent',
      dueAt: '2026-04-26T08:00:00.000Z',
      createdAt: '2026-04-24T08:00:00.000Z',
      updatedAt: '2026-04-24T08:00:00.000Z',
    })
    const completedTask = buildTask({
      id: 'task-done',
      title: 'Done high task',
      completed: true,
      completedAt: '2026-04-24T11:00:00.000Z',
      priority: 'high',
      createdAt: '2026-04-01T08:00:00.000Z',
      updatedAt: '2026-04-24T11:00:00.000Z',
    })

    useTaskStore.setState({
      tasks: [openTask, completedTask],
      filteredTasks: [openTask, completedTask],
      isHydrated: true,
      activeAction: null,
    })

    await act(async () => {
      root.render(<TaskOverview />)
    })

    const trigger = container.querySelector('button.overview-trigger-button')
    expect(trigger).toBeTruthy()

    await act(async () => {
      trigger?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const modal = container.querySelector('.task-modal.overview-modal')
    expect(modal).toBeTruthy()
    expect(modal?.querySelectorAll('.overview-console-panel').length).toBeGreaterThan(0)
    expect(modal?.querySelector('.overview-weekly-grid .task-console-chip.is-priority')).toBeTruthy()
    expect(modal?.querySelector('.overview-review-list .task-console-chip.is-priority')).toBeTruthy()
    expect(modal?.querySelector('.priority-badge')).toBeNull()

    const monthlyBars = Array.from(modal?.querySelectorAll<HTMLElement>('.overview-monthly-fill') ?? [])
    expect(monthlyBars).toHaveLength(6)
    expect(monthlyBars.every((bar) => bar.style.width.endsWith('%'))).toBe(true)
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
