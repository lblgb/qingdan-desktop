// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from './AppShell'
import { useTaskStore } from '../stores/taskStore'
import type { TaskItem } from '../features/tasks/task.types'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../components/TaskComposer', () => ({
  TaskComposer: () => null,
}))

vi.mock('../components/TaskGroupManager', () => ({
  TaskGroupManager: () => null,
}))

vi.mock('../components/TaskOverview', () => ({
  TaskOverview: () => null,
}))

vi.mock('../components/TaskSettings', () => ({
  TaskSettings: ({ isOpen, onOpenChange }: { isOpen: boolean; onOpenChange: (isOpen: boolean) => void }) => (
    <button aria-expanded={isOpen} aria-label="设置" onClick={() => onOpenChange(true)} type="button">
      设置
    </button>
  ),
}))

vi.mock('../components/TaskList', () => ({
  TaskList: () => {
    const { filteredTasks } = useTaskStore.getState()

    return (
      <ul aria-label="task-list-test-double">
        {filteredTasks.map((task) => (
          <li key={task.id}>{task.title}</li>
        ))}
      </ul>
    )
  },
}))

vi.mock('../components/TaskFeedbackToast', () => ({
  TaskFeedbackToast: () => null,
}))

vi.mock('../components/TaskErrorDialog', () => ({
  TaskErrorDialog: () => null,
}))

vi.mock('../components/TaskReminderCenter', () => ({
  TaskReminderCenter: ({
    buckets,
    onSelectTask,
  }: {
    buckets: {
      overdue: Array<unknown>
      upcoming: Array<unknown>
      focusWithoutDate: Array<unknown>
      recentlyReminded: Array<unknown>
    }
    onSelectTask: (taskId: string) => void
  }) => {
    const totalCount =
      buckets.overdue.length +
      buckets.upcoming.length +
      buckets.focusWithoutDate.length +
      buckets.recentlyReminded.length

    return (
      <button aria-label="提醒中心" onClick={() => onSelectTask('task-2')} type="button">
        提醒中心
        {totalCount > 0 ? <strong>{totalCount}</strong> : null}
      </button>
    )
  },
}))

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

describe('AppShell reminder navigation', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    useTaskStore.setState({
      tasks: [
        buildTask({ id: 'task-1', title: '任务一' }),
        buildTask({ id: 'task-2', title: '任务二', priority: 'urgent', dueAt: '2026-04-16T09:00:00.000Z' }),
      ],
      filteredTasks: [buildTask({ id: 'task-1', title: '任务一' })],
      taskGroups: [],
      activeFilter: 'active',
      activeArchiveFilter: 'active',
      activeGroupFilter: 'ungrouped',
      activePriorityFilter: 'medium',
      activeDateRange: 'no-date',
      activeSortBy: 'updated',
      reminderBuckets: {
        overdue: [],
        upcoming: [
          {
            task: buildTask({ id: 'task-2', title: '任务二', priority: 'urgent', dueAt: '2026-04-16T09:00:00.000Z' }),
            reason: 'upcoming',
            dueLabel: '30 分钟后到期',
          },
        ],
        focusWithoutDate: [],
        recentlyReminded: [],
      },
      isHydrated: true,
      hydrateTasks: vi.fn().mockResolvedValue(undefined),
      hydrateReminderPreferences: vi.fn().mockResolvedValue(undefined),
      startReminderAutoRefresh: vi.fn(),
      stopReminderAutoRefresh: vi.fn(),
      reminderNavigation: null,
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('resets filters before queueing reminder navigation when the target task is excluded by current filters', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    const button = container.querySelector('button[aria-label="提醒中心"]')
    await act(async () => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const state = useTaskStore.getState()
    expect(state.activeFilter).toBe('all')
    expect(state.activeGroupFilter).toBe('all-groups')
    expect(state.activePriorityFilter).toBe('all-priorities')
    expect(state.activeDateRange).toBe('all-time')
    expect(state.activeSortBy).toBe('default')
    expect(state.filteredTasks.map((task) => task.id)).toEqual(['task-2', 'task-1'])
    expect(state.reminderNavigation?.taskId).toBe('task-2')
  })

  it('shows archived completed tasks from the archive work view after starting from the active status filter', async () => {
    useTaskStore.setState({
      tasks: [
        buildTask({ id: 'active-task', title: '当前任务', archivedAt: null }),
        buildTask({
          id: 'archived-task',
          title: '归档任务',
          completed: true,
          archivedAt: '2026-04-16T10:00:00.000Z',
        }),
      ],
      filteredTasks: [buildTask({ id: 'active-task', title: '当前任务', archivedAt: null })],
      activeFilter: 'active',
      activeArchiveFilter: 'active',
    })

    await act(async () => {
      root.render(<AppShell />)
    })

    const archiveButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('归档'))
    expect(archiveButton).toBeTruthy()

    await act(async () => {
      archiveButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(useTaskStore.getState().activeArchiveFilter).toBe('archived')
    expect(useTaskStore.getState().activeFilter).toBe('all')
    expect(container.textContent).toContain('归档任务')
    expect(container.textContent).not.toContain('当前任务')
  })

  it('counts normal work views from non-archived tasks only', async () => {
    useTaskStore.setState({
      tasks: [
        buildTask({ id: 'active-task', title: '当前任务', completed: false, archivedAt: null }),
        buildTask({ id: 'completed-task', title: '完成任务', completed: true, archivedAt: null }),
        buildTask({
          id: 'archived-completed-task',
          title: '归档完成任务',
          completed: true,
          archivedAt: '2026-04-16T10:00:00.000Z',
        }),
      ],
      filteredTasks: [
        buildTask({ id: 'active-task', title: '当前任务', completed: false, archivedAt: null }),
        buildTask({ id: 'completed-task', title: '完成任务', completed: true, archivedAt: null }),
      ],
      activeFilter: 'all',
      activeArchiveFilter: 'active',
    })

    await act(async () => {
      root.render(<AppShell />)
    })

    const allButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('全部任务'))
    const activeButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('进行中'))
    const completedButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('已完成'))
    const archiveButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent?.includes('归档'))

    expect(allButton?.querySelector('strong')?.textContent).toBe('2')
    expect(activeButton?.querySelector('strong')?.textContent).toBe('1')
    expect(completedButton?.querySelector('strong')?.textContent).toBe('1')
    expect(archiveButton?.querySelector('strong')?.textContent).toBe('1')
  })

  it('renders console system action buttons including backup, reminder center, and settings', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    expect(container.querySelector('button[aria-label="备份与恢复"]')).toBeTruthy()
    expect(container.querySelector('button[aria-label="提醒中心"]')).toBeTruthy()
    expect(container.querySelector('button[aria-label="设置"]')).toBeTruthy()
  })

  it('shows the pending reminder count on the reminder center entry', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    const reminderEntry = container.querySelector('button[aria-label="提醒中心"]')

    expect(reminderEntry).toBeTruthy()
    expect(reminderEntry?.textContent).toContain('1')
  })
})
