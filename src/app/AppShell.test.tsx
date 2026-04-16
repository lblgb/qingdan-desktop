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
  TaskSettings: () => null,
}))

vi.mock('../components/TaskList', () => ({
  TaskList: () => null,
}))

vi.mock('../components/TaskFeedbackToast', () => ({
  TaskFeedbackToast: () => null,
}))

vi.mock('../components/TaskErrorDialog', () => ({
  TaskErrorDialog: () => null,
}))

vi.mock('../components/TaskReminderCenter', () => ({
  TaskReminderCenter: ({ onSelectTask }: { onSelectTask: (taskId: string) => void }) => (
    <button onClick={() => onSelectTask('task-2')} type="button">
      选择提醒任务
    </button>
  ),
}))

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

    const button = container.querySelector('button')
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
})
