import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_REMINDER_PREFERENCES } from '../features/tasks/task.reminders'
import { DEFAULT_TASK_QUERY } from '../features/tasks/task.filters'
import type { ReminderPreferences, TaskGroup, TaskItem } from '../features/tasks/task.types'

const mockLoadTaskGroups = vi.fn()
const mockQueryTasks = vi.fn()
const mockCreateTask = vi.fn()
const mockUpdateTask = vi.fn()
const mockToggleTask = vi.fn()
const mockDeleteTask = vi.fn()
const mockAssignTaskGroup = vi.fn()
const mockCreateTaskGroup = vi.fn()
const mockUpdateTaskGroup = vi.fn()
const mockDeleteTaskGroup = vi.fn()
const mockLoadTasks = vi.fn()
const mockBulkUpdateTasks = vi.fn()
const mockLoadReminderPreferences = vi.fn()
const mockSaveReminderPreferences = vi.fn()
const mockCreateBackup = vi.fn()
const mockRestoreBackup = vi.fn()
const mockIsPermissionGranted = vi.fn()
const mockRequestPermission = vi.fn()
const mockSendNotification = vi.fn()

vi.mock('../features/tasks/task.storage', () => ({
  loadTaskGroups: mockLoadTaskGroups,
  queryTasks: mockQueryTasks,
  createTask: mockCreateTask,
  updateTask: mockUpdateTask,
  toggleTask: mockToggleTask,
  deleteTask: mockDeleteTask,
  assignTaskGroup: mockAssignTaskGroup,
  createTaskGroup: mockCreateTaskGroup,
  updateTaskGroup: mockUpdateTaskGroup,
  deleteTaskGroup: mockDeleteTaskGroup,
  loadTasks: mockLoadTasks,
  bulkUpdateTasks: mockBulkUpdateTasks,
  loadReminderPreferences: mockLoadReminderPreferences,
  saveReminderPreferences: mockSaveReminderPreferences,
  createBackup: mockCreateBackup,
  restoreBackup: mockRestoreBackup,
}))

vi.mock('@tauri-apps/plugin-notification', () => ({
  isPermissionGranted: mockIsPermissionGranted,
  requestPermission: mockRequestPermission,
  sendNotification: mockSendNotification,
}))

function buildTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'task-1',
    title: '测试任务',
    description: '',
    note: '',
    completed: false,
    completedAt: null,
    archivedAt: null,
    groupId: null,
    dueAt: null,
    priority: 'medium',
    createdAt: '2026-04-16T00:00:00.000Z',
    updatedAt: '2026-04-16T00:00:00.000Z',
    ...overrides,
  }
}

function buildGroup(overrides: Partial<TaskGroup> = {}): TaskGroup {
  return {
    id: 'group-1',
    name: '测试分组',
    description: '',
    createdAt: '2026-04-16T00:00:00.000Z',
    updatedAt: '2026-04-16T00:00:00.000Z',
    ...overrides,
  }
}

async function loadStore() {
  vi.resetModules()
  return import('./taskStore')
}

beforeEach(() => {
  vi.clearAllMocks()
  mockLoadTaskGroups.mockResolvedValue([])
  mockQueryTasks.mockResolvedValue([])
  mockCreateTask.mockResolvedValue([])
  mockUpdateTask.mockResolvedValue([])
  mockToggleTask.mockResolvedValue([])
  mockDeleteTask.mockResolvedValue([])
  mockAssignTaskGroup.mockResolvedValue([])
  mockCreateTaskGroup.mockResolvedValue([])
  mockUpdateTaskGroup.mockResolvedValue([])
  mockDeleteTaskGroup.mockResolvedValue([])
  mockLoadTasks.mockResolvedValue([])
  mockBulkUpdateTasks.mockResolvedValue([])
  mockLoadReminderPreferences.mockResolvedValue(DEFAULT_REMINDER_PREFERENCES)
  mockSaveReminderPreferences.mockImplementation(async (input: ReminderPreferences) => input)
  mockCreateBackup.mockResolvedValue('C:\\backup\\qingdan.db')
  mockRestoreBackup.mockResolvedValue('C:\\backup\\qingdan.db')
  mockIsPermissionGranted.mockResolvedValue(true)
  mockRequestPermission.mockResolvedValue('granted')
  mockSendNotification.mockResolvedValue(undefined)
})

describe('taskStore reset and feedback', () => {
  it('resets filters to the default query and rebuilds visible tasks from current tasks', async () => {
    const { useTaskStore } = await loadStore()
    const taskA = buildTask({ id: 'task-a', priority: 'high' })
    const taskB = buildTask({ id: 'task-b', completed: true, priority: 'low' })

    useTaskStore.setState({
      tasks: [taskA, taskB],
      taskGroups: [buildGroup()],
      activeFilter: 'completed',
      activeGroupFilter: 'ungrouped',
      activePriorityFilter: 'high',
      activeDateRange: 'today',
      activeSortBy: 'updated',
      filteredTasks: [taskB],
    })

    useTaskStore.getState().resetFilters()

    const state = useTaskStore.getState()
    expect(state.activeFilter).toBe(DEFAULT_TASK_QUERY.status)
    expect(state.activeGroupFilter).toBe(DEFAULT_TASK_QUERY.group)
    expect(state.activePriorityFilter).toBe(DEFAULT_TASK_QUERY.priority)
    expect(state.activeDateRange).toBe(DEFAULT_TASK_QUERY.dateRange)
    expect(state.activeSortBy).toBe(DEFAULT_TASK_QUERY.sortBy)
    expect(state.filteredTasks).toHaveLength(2)
    expect(state.filteredTasks.map((task) => task.id)).toEqual(['task-a', 'task-b'])
  })

  it('opens and closes task detail state', async () => {
    const { useTaskStore } = await loadStore()

    useTaskStore.getState().openTaskDetail('task-detail')
    expect(useTaskStore.getState().editingTaskId).toBe('task-detail')

    useTaskStore.getState().closeTaskDetail()
    expect(useTaskStore.getState().editingTaskId).toBeNull()
  })


  it('tracks backup center visibility and the latest backup timestamp', async () => {
    const { useTaskStore } = await loadStore()

    expect(useTaskStore.getState().isBackupCenterOpen).toBe(false)
    expect(useTaskStore.getState().lastBackupAt).toBeNull()

    useTaskStore.getState().setBackupCenterOpen(true)
    useTaskStore.getState().setLastBackupAt('2026-04-25T10:30:00.000Z')

    expect(useTaskStore.getState().isBackupCenterOpen).toBe(true)
    expect(useTaskStore.getState().lastBackupAt).toBe('2026-04-25T10:30:00.000Z')
  })

  it('updates lastBackupAt after a successful backup', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-25T10:30:00.000Z'))

    const { useTaskStore } = await loadStore()

    const result = await useTaskStore.getState().createBackup('C:\\backup\\qingdan.db')

    expect(result).toBe(true)
    expect(mockCreateBackup).toHaveBeenCalledWith('C:\\backup\\qingdan.db')
    expect(useTaskStore.getState().lastBackupAt).toBe('2026-04-25T10:30:00.000Z')
    expect(useTaskStore.getState().successToast).toMatchObject({ source: 'backup' })

    vi.useRealTimers()
  })

  it('refreshes tasks after restoring from backup', async () => {
    const restoredTasks = [buildTask({ id: 'restored-task', title: 'Restored task' })]
    const restoredGroups = [buildGroup({ id: 'restored-group' })]
    mockLoadTasks.mockResolvedValue(restoredTasks)
    mockLoadTaskGroups.mockResolvedValue(restoredGroups)

    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      tasks: [buildTask({ id: 'old-task', title: 'Old task' })],
      filteredTasks: [buildTask({ id: 'old-task', title: 'Old task' })],
      activeFilter: 'all',
      activeArchiveFilter: 'active',
      activeGroupFilter: 'all-groups',
      activePriorityFilter: 'all-priorities',
      activeDateRange: 'all-time',
      activeSortBy: 'default',
    })

    const result = await useTaskStore.getState().restoreBackup('C:\\backup\\qingdan.db')

    expect(result).toBe(true)
    expect(mockRestoreBackup).toHaveBeenCalledWith('C:\\backup\\qingdan.db')
    expect(mockLoadTasks).toHaveBeenCalledTimes(1)
    expect(useTaskStore.getState().tasks).toEqual(restoredTasks)
    expect(useTaskStore.getState().taskGroups).toEqual(restoredGroups)
    expect(useTaskStore.getState().filteredTasks).toEqual(restoredTasks)
  })

  it('keeps the full task set after restore when current filters are non-default', async () => {
    const restoredAllTasks = [
      buildTask({ id: 'active-task', title: 'Active task', completed: false }),
      buildTask({
        id: 'completed-task',
        title: 'Completed task',
        completed: true,
        completedAt: '2026-04-16T02:00:00.000Z',
      }),
    ]
    mockLoadTasks.mockResolvedValue(restoredAllTasks)
    mockLoadTaskGroups.mockResolvedValue([])
    mockQueryTasks.mockResolvedValue([restoredAllTasks[1]])

    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      tasks: [buildTask({ id: 'old-task' })],
      filteredTasks: [buildTask({ id: 'old-task' })],
      activeFilter: 'completed',
      activeArchiveFilter: 'active',
      activeGroupFilter: 'all-groups',
      activePriorityFilter: 'all-priorities',
      activeDateRange: 'all-time',
      activeSortBy: 'default',
    })

    const result = await useTaskStore.getState().restoreBackup('C:\\backup\\qingdan.db')

    expect(result).toBe(true)
    expect(mockLoadTasks).toHaveBeenCalledTimes(1)
    expect(useTaskStore.getState().tasks).toEqual(restoredAllTasks)
    expect(useTaskStore.getState().filteredTasks).toEqual([restoredAllTasks[1]])
  })

  it('filters visible tasks by archive state', async () => {
    const { useTaskStore } = await loadStore()
    const activeTask = buildTask({ id: 'active-task', archivedAt: null })
    const archivedTask = buildTask({
      id: 'archived-task',
      archivedAt: '2026-04-16T01:00:00.000Z',
    })

    useTaskStore.setState({
      tasks: [activeTask, archivedTask],
      filteredTasks: [activeTask],
    })

    useTaskStore.getState().setArchiveFilter('archived')

    const state = useTaskStore.getState()
    expect(state.activeArchiveFilter).toBe('archived')
    expect(state.filteredTasks.map((task) => task.id)).toEqual(['archived-task'])
  })

  it('archives a single task through bulk update and shows success feedback', async () => {
    const doneTask = buildTask({
      id: 'done',
      completed: true,
      completedAt: '2026-04-16T01:00:00.000Z',
    })
    const archivedDoneTask = {
      ...doneTask,
      archivedAt: '2026-04-16T02:00:00.000Z',
    }
    mockBulkUpdateTasks.mockResolvedValue([archivedDoneTask])

    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      tasks: [doneTask],
      filteredTasks: [doneTask],
    })

    await useTaskStore.getState().archiveTask('done')

    const state = useTaskStore.getState()
    expect(mockBulkUpdateTasks).toHaveBeenCalledWith({ taskIds: ['done'], archive: true })
    expect(state.tasks).toEqual([archivedDoneTask])
    expect(state.filteredTasks).toEqual([])
    expect(state.successToast).toEqual({
      tone: 'success',
      message: '任务已归档。',
      source: 'bulk',
    })
    expect(state.errorDialog).toBeNull()
  })

  it('archives selected tasks and clears bulk selection on success', async () => {
    const doneTask = buildTask({
      id: 'done',
      completed: true,
      completedAt: '2026-04-16T01:00:00.000Z',
    })
    const secondDoneTask = buildTask({
      id: 'done-2',
      completed: true,
      completedAt: '2026-04-16T01:30:00.000Z',
    })
    const archivedTasks = [
      { ...doneTask, archivedAt: '2026-04-16T02:00:00.000Z' },
      { ...secondDoneTask, archivedAt: '2026-04-16T02:00:00.000Z' },
    ]
    mockBulkUpdateTasks.mockResolvedValue(archivedTasks)

    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      tasks: [doneTask, secondDoneTask],
      filteredTasks: [doneTask, secondDoneTask],
      isBulkMode: true,
      selectedTaskIds: ['done', 'done-2'],
    })

    await useTaskStore.getState().applyBulkArchive()

    const state = useTaskStore.getState()
    expect(mockBulkUpdateTasks).toHaveBeenCalledWith({ taskIds: ['done', 'done-2'], archive: true })
    expect(state.filteredTasks).toEqual([])
    expect(state.isBulkMode).toBe(false)
    expect(state.selectedTaskIds).toEqual([])
    expect(state.successToast).toEqual({
      tone: 'success',
      message: '已归档选中任务。',
      source: 'bulk',
    })
  })

  it('does nothing when applying bulk archive with no selected tasks', async () => {
    const taskA = buildTask({ id: 'task-a' })
    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      tasks: [taskA],
      filteredTasks: [taskA],
      isBulkMode: true,
      selectedTaskIds: [],
      successToast: null,
      errorDialog: null,
    })

    await useTaskStore.getState().applyBulkArchive()

    const state = useTaskStore.getState()
    expect(mockBulkUpdateTasks).not.toHaveBeenCalled()
    expect(state.tasks).toEqual([taskA])
    expect(state.filteredTasks).toEqual([taskA])
    expect(state.isBulkMode).toBe(true)
    expect(state.selectedTaskIds).toEqual([])
    expect(state.successToast).toBeNull()
    expect(state.errorDialog).toBeNull()
    expect(state.isMutating).toBe(false)
    expect(state.activeAction).toBeNull()
  })

  it('keeps bulk selection and shows archive failure details when bulk archive fails', async () => {
    mockBulkUpdateTasks.mockRejectedValueOnce(new Error('归档失败原因'))

    const doneTask = buildTask({
      id: 'done',
      completed: true,
      completedAt: '2026-04-16T01:00:00.000Z',
    })
    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      tasks: [doneTask],
      filteredTasks: [doneTask],
      isBulkMode: true,
      selectedTaskIds: ['done'],
    })

    await useTaskStore.getState().applyBulkArchive()

    const state = useTaskStore.getState()
    expect(mockBulkUpdateTasks).toHaveBeenCalledWith({ taskIds: ['done'], archive: true })
    expect(state.tasks).toEqual([doneTask])
    expect(state.filteredTasks).toEqual([doneTask])
    expect(state.isBulkMode).toBe(true)
    expect(state.selectedTaskIds).toEqual(['done'])
    expect(state.successToast).toBeNull()
    expect(state.errorDialog).toEqual({
      title: '归档失败',
      message: '归档失败原因',
      source: 'bulk',
    })
    expect(state.isMutating).toBe(false)
    expect(state.activeAction).toBeNull()
  })

  it('stores success toast state for successful task creation', async () => {
    const nextTasks = [buildTask({ id: 'task-created' })]
    mockCreateTask.mockResolvedValue(nextTasks)

    const { useTaskStore } = await loadStore()

    await useTaskStore.getState().addTask({
      title: '新建任务',
      description: '',
      priority: 'medium',
      dueAt: null,
      groupId: null,
    })

    const state = useTaskStore.getState()
    expect(state.tasks).toEqual(nextTasks)
    expect(state.successToast).toEqual({
      tone: 'success',
      message: '任务已保存到本地清单。',
      source: 'create',
    })
    expect(state.errorDialog).toBeNull()
    expect(state.feedback).toBeNull()
  })

  it('stores error dialog state for failed task creation', async () => {
    mockCreateTask.mockRejectedValue(new Error('保存失败'))

    const { useTaskStore } = await loadStore()

    await useTaskStore.getState().addTask({
      title: '新建任务',
      description: '',
      priority: 'medium',
      dueAt: null,
      groupId: null,
    })

    const state = useTaskStore.getState()
    expect(state.successToast).toBeNull()
    expect(state.errorDialog).toEqual({
      title: '任务创建失败',
      message: '保存失败',
      source: 'create',
    })
    expect(state.feedback).toBeNull()
  })

  it('stores success toast state for successful task update', async () => {
    const nextTasks = [buildTask({ id: 'task-updated', title: '已更新任务' })]
    mockUpdateTask.mockResolvedValue(nextTasks)

    const { useTaskStore } = await loadStore()

    await useTaskStore.getState().updateTask({
      id: 'task-updated',
      title: '已更新任务',
      description: '',
      note: '',
      priority: 'high',
      dueAt: null,
      groupId: null,
    })

    const state = useTaskStore.getState()
    expect(state.tasks).toEqual(nextTasks)
    expect(state.successToast).toEqual({
      tone: 'success',
      message: '任务修改已保存。',
      source: 'update',
    })
    expect(state.errorDialog).toBeNull()
    expect(state.feedback).toBeNull()
  })

  it('stores hydrate failures in the error dialog', async () => {
    mockLoadTaskGroups.mockRejectedValueOnce(new Error('加载失败'))

    const { useTaskStore } = await loadStore()

    await useTaskStore.getState().hydrateTasks()

    const state = useTaskStore.getState()
    expect(state.isLoading).toBe(false)
    expect(state.activeAction).toBeNull()
    expect(state.successToast).toBeNull()
    expect(state.errorDialog).toEqual({
      title: '任务列表读取失败',
      message: '加载失败',
      source: 'hydrate',
    })
    expect(state.feedback).toBeNull()
  })

  it('hydrates reminder preferences and derives reminder buckets in shared state', async () => {
    const preferences: ReminderPreferences = {
      ...DEFAULT_REMINDER_PREFERENCES,
      priorityThreshold: 'medium',
    }
    const overdueTask = buildTask({
      id: 'task-overdue',
      priority: 'medium',
      dueAt: '2026-04-15T08:00:00.000Z',
    })
    mockLoadReminderPreferences.mockResolvedValue(preferences)

    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      tasks: [overdueTask],
    })

    await useTaskStore.getState().hydrateReminderPreferences('2026-04-16T08:30:00.000Z')

    const state = useTaskStore.getState()
    expect(state.reminderPreferences).toEqual(preferences)
    expect(state.reminderBuckets.overdue.map((item) => item.task.id)).toEqual(['task-overdue'])
    expect(state.reminderSnapshotAt).toBe('2026-04-16T08:30:00.000Z')
  })

  it('surfaces reminder preference save failures through the error dialog', async () => {
    mockSaveReminderPreferences.mockRejectedValue(new Error('提醒设置保存失败'))

    const { useTaskStore } = await loadStore()

    const result = await useTaskStore.getState().saveReminderPreferences({
      ...DEFAULT_REMINDER_PREFERENCES,
      offsetPreset: 'custom',
      customOffsetMinutes: 45,
    })

    const state = useTaskStore.getState()
    expect(result).toBe(false)
    expect(state.errorDialog).toEqual({
      title: '提醒设置保存失败',
      message: '提醒设置保存失败',
      source: 'reminder',
    })
    expect(state.isSavingReminderPreferences).toBe(false)
  })

  it('returns success when reminder preferences save completes', async () => {
    const { useTaskStore } = await loadStore()

    const result = await useTaskStore.getState().saveReminderPreferences({
      ...DEFAULT_REMINDER_PREFERENCES,
      offsetPreset: 'custom',
      customOffsetMinutes: 30,
    })

    const state = useTaskStore.getState()
    expect(result).toBe(true)
    expect(state.reminderPreferences.customOffsetMinutes).toBe(30)
    expect(state.errorDialog).toBeNull()
  })

  it('refreshes reminder buckets when time advances without task mutations', async () => {
    const futureDueTask = buildTask({
      id: 'task-future',
      priority: 'urgent',
      dueAt: '2026-04-16T09:00:00.000Z',
    })

    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      tasks: [futureDueTask],
      reminderPreferences: DEFAULT_REMINDER_PREFERENCES,
    })

    useTaskStore.getState().refreshReminderBuckets('2026-04-16T08:00:00.000Z')
    expect(useTaskStore.getState().reminderBuckets.overdue).toHaveLength(0)

    useTaskStore.getState().refreshReminderBuckets('2026-04-16T09:30:00.000Z')
    expect(useTaskStore.getState().reminderBuckets.overdue.map((item) => item.task.id)).toEqual(['task-future'])
  })

  it('sends runtime desktop notifications once per reminder item when desktop reminders are enabled', async () => {
    const dueSoonTask = buildTask({
      id: 'task-due-soon',
      title: '即将到期任务',
      priority: 'urgent',
      dueAt: '2026-04-16T09:00:00.000Z',
    })

    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      tasks: [dueSoonTask],
      filteredTasks: [dueSoonTask],
      reminderPreferences: {
        ...DEFAULT_REMINDER_PREFERENCES,
        enableDesktop: true,
      },
    })

    useTaskStore.getState().refreshReminderBuckets('2026-04-16T08:30:00.000Z')
    await vi.waitFor(() => {
      expect(mockSendNotification).toHaveBeenCalledTimes(1)
    })

    useTaskStore.getState().refreshReminderBuckets('2026-04-16T08:31:00.000Z')
    await Promise.resolve()

    expect(mockSendNotification).toHaveBeenCalledTimes(1)
  })

  it('does not send desktop notifications for undated reminder items', async () => {
    const focusTask = buildTask({
      id: 'task-focus',
      title: '未排期高优任务',
      priority: 'high',
      dueAt: null,
    })

    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      tasks: [focusTask],
      filteredTasks: [focusTask],
      reminderPreferences: {
        ...DEFAULT_REMINDER_PREFERENCES,
        enableDesktop: true,
      },
    })

    useTaskStore.getState().refreshReminderBuckets('2026-04-16T08:30:00.000Z')
    await Promise.resolve()

    expect(mockSendNotification).not.toHaveBeenCalled()
  })

  it('rechecks system permission after a prior desktop permission denial', async () => {
    const dueSoonTask = buildTask({
      id: 'task-due-soon',
      title: '即将到期任务',
      priority: 'urgent',
      dueAt: '2026-04-16T09:00:00.000Z',
    })

    mockIsPermissionGranted.mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    mockRequestPermission.mockResolvedValueOnce('denied')

    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      tasks: [dueSoonTask],
      filteredTasks: [dueSoonTask],
      reminderPreferences: {
        ...DEFAULT_REMINDER_PREFERENCES,
        enableDesktop: true,
      },
    })

    useTaskStore.getState().refreshReminderBuckets('2026-04-16T08:30:00.000Z')
    await vi.waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalledTimes(1)
    })
    expect(mockSendNotification).not.toHaveBeenCalled()

    useTaskStore.getState().refreshReminderBuckets('2026-04-16T08:31:00.000Z')
    await vi.waitFor(() => {
      expect(mockSendNotification).toHaveBeenCalledTimes(1)
    })
  })

  it('does not double-send the same desktop reminder while a prior notification is still in flight', async () => {
    const dueSoonTask = buildTask({
      id: 'task-due-soon',
      title: '即将到期任务',
      priority: 'urgent',
      dueAt: '2026-04-16T09:00:00.000Z',
    })

    let resolveNotification: (() => void) | null = null
    mockSendNotification.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          resolveNotification = resolve
        }),
    )

    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      tasks: [dueSoonTask],
      filteredTasks: [dueSoonTask],
      reminderPreferences: {
        ...DEFAULT_REMINDER_PREFERENCES,
        enableDesktop: true,
      },
    })

    useTaskStore.getState().refreshReminderBuckets('2026-04-16T08:30:00.000Z')
    useTaskStore.getState().refreshReminderBuckets('2026-04-16T08:30:30.000Z')

    await vi.waitFor(() => {
      expect(mockSendNotification).toHaveBeenCalledTimes(1)
    })

    const completeNotification = resolveNotification as (() => void) | null
    if (completeNotification) {
      completeNotification()
    }
    await Promise.resolve()
  })

  it('sends a test desktop notification and shows success feedback when permission is allowed', async () => {
    const { useTaskStore } = await loadStore()

    await useTaskStore.getState().sendTestDesktopNotification()

    const state = useTaskStore.getState()
    expect(mockSendNotification).toHaveBeenCalledWith({
      title: '轻单测试通知',
      body: '桌面系统通知可用。轻单运行期间会按提醒规则触发通知。',
    })
    expect(state.notificationPermissionStatus).toBe('allowed')
    expect(state.successToast).toEqual({
      tone: 'success',
      message: '测试通知已发送。',
      source: 'reminder',
    })
    expect(state.errorDialog).toBeNull()
  })

  it('marks test desktop notification permission as denied when the permission request is denied', async () => {
    mockIsPermissionGranted.mockResolvedValueOnce(false)
    mockRequestPermission.mockResolvedValueOnce('denied')

    const { useTaskStore } = await loadStore()

    await useTaskStore.getState().sendTestDesktopNotification()

    const state = useTaskStore.getState()
    expect(mockSendNotification).not.toHaveBeenCalled()
    expect(state.notificationPermissionStatus).toBe('denied')
    expect(state.successToast).toBeNull()
    expect(state.errorDialog).toMatchObject({ source: 'reminder' })
  })

  it('marks test desktop notification status as error when sending fails after permission is allowed', async () => {
    mockSendNotification.mockRejectedValueOnce(new Error('send failed'))

    const { useTaskStore } = await loadStore()

    await useTaskStore.getState().sendTestDesktopNotification()

    const state = useTaskStore.getState()
    expect(mockIsPermissionGranted).toHaveBeenCalledTimes(1)
    expect(mockRequestPermission).not.toHaveBeenCalled()
    expect(mockSendNotification).toHaveBeenCalledTimes(1)
    expect(state.notificationPermissionStatus).toBe('error')
    expect(state.successToast).toBeNull()
    expect(state.errorDialog).toMatchObject({ source: 'reminder' })
  })

  it('preserves denied notification permission status when refresh sees no system grant', async () => {
    mockIsPermissionGranted.mockResolvedValueOnce(false)

    const { useTaskStore } = await loadStore()

    useTaskStore.setState({ notificationPermissionStatus: 'denied' })
    await useTaskStore.getState().refreshNotificationPermissionStatus()

    expect(useTaskStore.getState().notificationPermissionStatus).toBe('denied')
  })

  it('bypasses background permission cooldown for user-initiated test notifications', async () => {
    const dueSoonTask = buildTask({
      id: 'task-due-soon',
      title: '鍗冲皢鍒版湡浠诲姟',
      priority: 'urgent',
      dueAt: '2026-04-16T09:00:00.000Z',
    })
    mockIsPermissionGranted.mockResolvedValue(false)
    mockRequestPermission.mockResolvedValueOnce('denied').mockResolvedValueOnce('granted')

    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      tasks: [dueSoonTask],
      filteredTasks: [dueSoonTask],
      reminderPreferences: {
        ...DEFAULT_REMINDER_PREFERENCES,
        enableDesktop: true,
      },
    })

    useTaskStore.getState().refreshReminderBuckets('2026-04-16T08:30:00.000Z')
    await vi.waitFor(() => {
      expect(mockRequestPermission).toHaveBeenCalledTimes(1)
    })

    await useTaskStore.getState().sendTestDesktopNotification()

    expect(mockRequestPermission).toHaveBeenCalledTimes(2)
    expect(mockSendNotification).toHaveBeenCalledTimes(1)
    expect(useTaskStore.getState().notificationPermissionStatus).toBe('allowed')
  })

  it('clears success toast and error dialog through explicit actions', async () => {
    const { useTaskStore } = await loadStore()

    useTaskStore.setState({
      successToast: {
        tone: 'success',
        message: '已保存',
        source: 'update',
      },
      errorDialog: {
        title: '保存失败',
        message: '请稍后重试',
        source: 'update',
      },
    })

    useTaskStore.getState().dismissSuccessToast()
    useTaskStore.getState().closeErrorDialog()

    const state = useTaskStore.getState()
    expect(state.successToast).toBeNull()
    expect(state.errorDialog).toBeNull()
  })
})
