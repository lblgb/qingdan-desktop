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
  TaskOverview: () => null,
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

describe('AppShell console action bar', () => {
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
    })
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('renders the real backup, reminder center, and settings system entries', async () => {
    await act(async () => {
      root.render(<AppShell />)
    })

    expect(container.querySelector('button[aria-label="备份与恢复"]')).toBeTruthy()
    expect(container.querySelector('button[aria-label="提醒中心"]')).toBeTruthy()
    expect(container.querySelector('button[aria-label="设置"]')).toBeTruthy()
  })

  it('shows the pending reminder badge count on the real reminder center entry', async () => {
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
})
