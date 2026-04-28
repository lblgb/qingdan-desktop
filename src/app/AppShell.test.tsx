// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_REMINDER_PREFERENCES } from '../features/tasks/task.reminders'
import type { TaskItem } from '../features/tasks/task.types'
import { useTaskStore } from '../stores/taskStore'
import { AppShell } from './AppShell'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../components/TaskComposer', () => ({
  TaskComposer: () => null,
}))

vi.mock('../components/TaskGroupManager', () => ({
  TaskGroupManager: () => null,
}))

vi.mock('../components/TaskOverview', () => ({
  TaskOverview: () => <button type="button">任务概览</button>,
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

vi.mock('../components/TaskDetailDialog', () => ({
  TaskDetailDialog: () => null,
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

describe('AppShell console workspace', () => {
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
      searchKeyword: '',
      searchResults: [],
      activeAction: null,
      feedback: null,
      reminderPreferences: DEFAULT_REMINDER_PREFERENCES,
      reminderBuckets: {
        overdue: [
          {
            task: buildTask({ id: 'task-3', title: '任务三', priority: 'high', dueAt: '2026-04-16T07:00:00.000Z' }),
            reason: 'overdue',
            dueLabel: '已逾期',
          },
        ],
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
      notificationPermissionStatus: 'not-requested',
      isSavingReminderPreferences: false,
      hydrateTasks: vi.fn().mockResolvedValue(undefined),
      hydrateReminderPreferences: vi.fn().mockResolvedValue(undefined),
      saveReminderPreferences: vi.fn().mockResolvedValue(true),
      refreshNotificationPermissionStatus: vi.fn().mockResolvedValue(undefined),
      sendTestDesktopNotification: vi.fn().mockResolvedValue(undefined),
      startReminderAutoRefresh: vi.fn(),
      stopReminderAutoRefresh: vi.fn(),
      dismissFeedback: vi.fn(),
      queueReminderNavigation: useTaskStore.getState().queueReminderNavigation,
      reminderNavigation: null,
      editingTaskId: null,
      closeTaskDetail: vi.fn(),
      updateTask: vi.fn().mockResolvedValue(undefined),
      archiveTask: vi.fn().mockResolvedValue(undefined),
      setSearchKeyword: useTaskStore.getState().setSearchKeyword,
      focusTaskFromSearch: useTaskStore.getState().focusTaskFromSearch,
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('renders a compact system icon group for backup, reminder center, and settings', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    const systemActions = container.querySelector('[aria-label="系统入口"]')
    const backupEntry = container.querySelector('button[aria-label="备份与恢复"]')
    const reminderEntry = container.querySelector('button[aria-label="提醒中心"]')
    const settingsEntry = container.querySelector('button[aria-label="设置"]')

    expect(systemActions).toBeTruthy()
    expect(backupEntry).toBeTruthy()
    expect(reminderEntry).toBeTruthy()
    expect(settingsEntry).toBeTruthy()
    expect(backupEntry?.querySelector('.icon-button-label')).toBeNull()
    expect(reminderEntry?.querySelector('.icon-button-label')).toBeNull()
    expect(settingsEntry?.querySelector('.icon-button-label')).toBeNull()
  })

  it('splits the workspace into left navigation, center board, and right system bay', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    expect(container.querySelector('.theme-coldsteel')).toBeTruthy()
    expect(container.querySelector('[aria-label="工作区布局"]')).toBeTruthy()
    expect(container.querySelector('[aria-label="导航矩阵"]')).toBeTruthy()
    expect(container.querySelector('[aria-label="任务主战场"]')).toBeTruthy()
    expect(container.querySelector('[aria-label="系统仓"]')).toBeTruthy()
    expect(container.textContent).toContain('系统状态')
  })

  it('mounts the real backup center entry and opens the panel', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    const backupEntry = container.querySelector('button[aria-label="备份与恢复"]')

    expect(backupEntry).toBeTruthy()

    await act(async () => {
      backupEntry?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(container.textContent).toContain('备份与恢复中心')
    expect(container.textContent).toContain('立即备份')
  })

  it('shows the pending reminder badge count on the reminder entry', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    const reminderEntry = container.querySelector('button[aria-label="提醒中心"]')
    const badge = reminderEntry?.querySelector('.icon-button-badge')

    expect(reminderEntry).toBeTruthy()
    expect(badge?.textContent).toBe('2')
  })

  it('resets filters before queueing reminder navigation when selecting a reminder hidden by current filters', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    const reminderEntry = container.querySelector('button[aria-label="提醒中心"]')
    await act(async () => {
      reminderEntry?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const reminderItem = Array.from(container.querySelectorAll('.task-reminder-item')).find((item) =>
      item.textContent?.includes('任务二'),
    )

    await act(async () => {
      reminderItem?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
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

  it('mounts the global search input and clears search state after selecting a result', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    const input = container.querySelector('input[aria-label="搜索任务"]') as HTMLInputElement
    expect(input).toBeTruthy()

    await act(async () => {
      useTaskStore.getState().setSearchKeyword('任务二')
    })

    const resultButton = Array.from(container.querySelectorAll('.global-task-search-result')).find((item) =>
      item.textContent?.includes('任务二'),
    )
    expect(resultButton).toBeTruthy()

    await act(async () => {
      resultButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    const state = useTaskStore.getState()
    expect(state.searchKeyword).toBe('')
    expect(state.searchResults).toEqual([])
    expect(state.reminderNavigation?.taskId).toBe('task-2')
    expect(state.activeArchiveFilter).toBe('all')
  })
})
