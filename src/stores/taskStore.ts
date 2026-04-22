/**
 * 文件说明：统一管理任务状态、筛选状态、提醒偏好和全局反馈。
 */
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import { create } from 'zustand'
import { applyTaskQuery, DEFAULT_TASK_QUERY } from '../features/tasks/task.filters'
import {
  DEFAULT_REMINDER_PREFERENCES,
  deriveDesktopNotificationItems,
  deriveReminderBuckets,
  EMPTY_REMINDER_BUCKETS,
  type ReminderBuckets,
} from '../features/tasks/task.reminders'
import {
  assignTaskGroup,
  bulkUpdateTasks,
  createTask,
  createTaskGroup,
  deleteTask,
  deleteTaskGroup,
  loadReminderPreferences,
  loadTaskGroups,
  loadTasks,
  queryTasks,
  saveReminderPreferences as persistReminderPreferences,
  toggleTask,
  updateTask,
  updateTaskGroup,
} from '../features/tasks/task.storage'
import type {
  BulkUpdateTasksInput,
  CreateTaskGroupInput,
  CreateTaskInput,
  ReminderPreferences,
  TaskArchiveFilter,
  TaskDateRangeFilter,
  TaskFilter,
  TaskGroup,
  TaskGroupFilter,
  TaskItem,
  TaskPriorityFilter,
  TaskQueryInput,
  TaskSortBy,
  UpdateTaskGroupInput,
  UpdateTaskInput,
} from '../features/tasks/task.types'

type TaskAction = 'hydrate' | 'create' | 'update' | 'toggle' | 'remove' | 'group' | 'bulk' | 'reminder'
type TaskFeedbackTone = 'success' | 'error'

interface TaskFeedback {
  tone: TaskFeedbackTone
  message: string
}

interface TaskSuccessToast {
  tone: 'success'
  message: string
  source: TaskAction
}

interface TaskErrorDialog {
  title: string
  message: string
  source: TaskAction
}

interface ReminderNavigationState {
  taskId: string
  requestedAt: number
}

interface TaskState {
  tasks: TaskItem[]
  taskGroups: TaskGroup[]
  activeFilter: TaskFilter
  activeArchiveFilter: TaskArchiveFilter
  activeGroupFilter: TaskGroupFilter
  activePriorityFilter: TaskPriorityFilter
  activeDateRange: TaskDateRangeFilter
  activeSortBy: TaskSortBy
  editingTaskId: string | null
  filteredTasks: TaskItem[]
  reminderPreferences: ReminderPreferences
  reminderBuckets: ReminderBuckets
  reminderSnapshotAt: string | null
  isReminderPreferencesLoading: boolean
  isSavingReminderPreferences: boolean
  isBulkMode: boolean
  selectedTaskIds: string[]
  isHydrated: boolean
  isLoading: boolean
  isMutating: boolean
  activeAction: TaskAction | null
  /**
   * Legacy compatibility only.
   * Current UI consumers still read `feedback` / call `dismissFeedback`, but new
   * mutation results must use `successToast` and `errorDialog` as the source of truth.
   */
  feedback: TaskFeedback | null
  successToast: TaskSuccessToast | null
  errorDialog: TaskErrorDialog | null
  reminderNavigation: ReminderNavigationState | null
  hydrateTasks: () => Promise<void>
  hydrateReminderPreferences: (nowIso?: string) => Promise<void>
  saveReminderPreferences: (input: ReminderPreferences, nowIso?: string) => Promise<boolean>
  refreshReminderBuckets: (nowIso?: string) => void
  startReminderAutoRefresh: () => void
  stopReminderAutoRefresh: () => void
  dismissSuccessToast: () => void
  closeErrorDialog: () => void
  openTaskDetail: (taskId: string) => void
  closeTaskDetail: () => void
  setFilter: (filter: TaskFilter) => void
  setArchiveFilter: (filter: TaskArchiveFilter) => void
  setGroupFilter: (filter: TaskGroupFilter) => void
  setPriorityFilter: (filter: TaskPriorityFilter) => void
  setDateRange: (filter: TaskDateRangeFilter) => void
  setSortBy: (sortBy: TaskSortBy) => void
  resetFilters: () => void
  addTask: (input: CreateTaskInput) => Promise<void>
  updateTask: (input: UpdateTaskInput) => Promise<void>
  toggleTask: (taskId: string) => Promise<void>
  archiveTask: (taskId: string) => Promise<void>
  removeTask: (taskId: string) => Promise<void>
  updateTaskGroupAssignment: (taskId: string, groupId: string | null) => Promise<void>
  addTaskGroup: (input: CreateTaskGroupInput) => Promise<void>
  updateTaskGroup: (input: UpdateTaskGroupInput) => Promise<void>
  removeTaskGroup: (groupId: string) => Promise<void>
  toggleBulkMode: () => void
  toggleTaskSelection: (taskId: string) => void
  clearTaskSelection: () => void
  applyBulkArchive: () => Promise<void>
  applyBulkUpdate: (input: BulkUpdateTasksInput) => Promise<void>
  /** Legacy compatibility no-op for current UI consumers. */
  dismissFeedback: () => void
  queueReminderNavigation: (taskId: string) => void
  clearReminderNavigation: () => void
}

let reminderAutoRefreshTimer: ReturnType<typeof setInterval> | null = null
let notifiedDesktopReminderKeys = new Set<string>()
let pendingDesktopReminderKeys = new Set<string>()
let desktopNotificationPermissionState: 'unknown' | 'granted' = 'unknown'
let lastDesktopPermissionRequestAt = 0
const DESKTOP_PERMISSION_REQUEST_COOLDOWN_MS = 5 * 60_000

function buildVisibleTasks(tasks: TaskItem[], query: TaskQueryInput) {
  return applyTaskQuery(tasks, query)
}

function normalizeGroupFilter(taskGroups: TaskGroup[], activeGroupFilter: TaskGroupFilter): TaskGroupFilter {
  if (activeGroupFilter === 'all-groups' || activeGroupFilter === 'ungrouped') {
    return activeGroupFilter
  }

  return taskGroups.some((group) => group.id === activeGroupFilter) ? activeGroupFilter : 'all-groups'
}

function buildQuery(
  state: Pick<
    TaskState,
    'activeFilter' | 'activeArchiveFilter' | 'activeGroupFilter' | 'activePriorityFilter' | 'activeDateRange' | 'activeSortBy'
  >,
): TaskQueryInput {
  return {
    status: state.activeFilter,
    archive: state.activeArchiveFilter,
    group: state.activeGroupFilter,
    priority: state.activePriorityFilter,
    dateRange: state.activeDateRange,
    sortBy: state.activeSortBy,
  }
}

function getNowIso(nowIso?: string) {
  return nowIso ?? new Date().toISOString()
}

function buildReminderState(tasks: TaskItem[], preferences: ReminderPreferences, nowIso?: string) {
  const snapshotAt = getNowIso(nowIso)
  return {
    reminderSnapshotAt: snapshotAt,
    reminderBuckets: deriveReminderBuckets(tasks, preferences, snapshotAt),
  }
}

async function ensureDesktopNotificationPermission() {
  if (desktopNotificationPermissionState === 'granted') {
    return true
  }

  const granted = await isPermissionGranted()
  if (granted) {
    desktopNotificationPermissionState = 'granted'
    return true
  }

  if (Date.now() - lastDesktopPermissionRequestAt < DESKTOP_PERMISSION_REQUEST_COOLDOWN_MS) {
    return false
  }

  lastDesktopPermissionRequestAt = Date.now()
  const permission = await requestPermission()
  if (permission === 'granted') {
    desktopNotificationPermissionState = 'granted'
    return true
  }

  return false
}

async function syncDesktopNotifications(tasks: TaskItem[], preferences: ReminderPreferences, nowIso?: string) {
  if (!preferences.enableDesktop) {
    notifiedDesktopReminderKeys.clear()
    pendingDesktopReminderKeys.clear()
    return
  }

  const snapshotAt = getNowIso(nowIso)
  const reminderItems = deriveDesktopNotificationItems(tasks, preferences, snapshotAt)
  const activeKeys = new Set(reminderItems.map((item) => item.notificationKey))

  notifiedDesktopReminderKeys.forEach((key) => {
    if (!activeKeys.has(key)) {
      notifiedDesktopReminderKeys.delete(key)
    }
  })

  const pendingItems = reminderItems.filter(
    (item) =>
      !notifiedDesktopReminderKeys.has(item.notificationKey) &&
      !pendingDesktopReminderKeys.has(item.notificationKey),
  )
  if (pendingItems.length === 0) {
    return
  }

  pendingItems.forEach((item) => pendingDesktopReminderKeys.add(item.notificationKey))

  try {
    const permissionGranted = await ensureDesktopNotificationPermission()
    if (!permissionGranted) {
      return
    }

    for (const item of pendingItems) {
      await sendNotification({
        title: item.task.title,
        body: item.dueLabel,
      })
      notifiedDesktopReminderKeys.add(item.notificationKey)
    }
  } catch {
    // 桌面通知失败不阻塞主流程，应用内提醒仍然可用。
  } finally {
    pendingItems.forEach((item) => pendingDesktopReminderKeys.delete(item.notificationKey))
  }
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  taskGroups: [],
  activeFilter: DEFAULT_TASK_QUERY.status,
  activeArchiveFilter: DEFAULT_TASK_QUERY.archive,
  activeGroupFilter: DEFAULT_TASK_QUERY.group,
  activePriorityFilter: DEFAULT_TASK_QUERY.priority,
  activeDateRange: DEFAULT_TASK_QUERY.dateRange,
  activeSortBy: DEFAULT_TASK_QUERY.sortBy,
  editingTaskId: null,
  filteredTasks: [],
  reminderPreferences: DEFAULT_REMINDER_PREFERENCES,
  reminderBuckets: EMPTY_REMINDER_BUCKETS,
  reminderSnapshotAt: null,
  isReminderPreferencesLoading: false,
  isSavingReminderPreferences: false,
  isBulkMode: false,
  selectedTaskIds: [],
  isHydrated: false,
  isLoading: false,
  isMutating: false,
  activeAction: null,
  feedback: null,
  successToast: null,
  errorDialog: null,
  reminderNavigation: null,
  hydrateTasks: async () => {
    if (get().isHydrated || get().isLoading) {
      return
    }

    set({
      isLoading: true,
      activeAction: 'hydrate',
      feedback: null,
      successToast: null,
      errorDialog: null,
    })

    try {
      const [taskGroups, tasks] = await Promise.all([loadTaskGroups(), queryTasks(buildQuery(get()))])
      set((state) => {
        const activeGroupFilter = normalizeGroupFilter(taskGroups, state.activeGroupFilter)
        const nextQuery = buildQuery({
          ...state,
          activeGroupFilter,
        })

        return {
          tasks,
          taskGroups,
          activeGroupFilter,
          filteredTasks: buildVisibleTasks(tasks, nextQuery),
          isHydrated: true,
          isLoading: false,
          activeAction: null,
          ...buildReminderState(tasks, state.reminderPreferences),
        }
      })
      void syncDesktopNotifications(tasks, get().reminderPreferences)
    } catch (error) {
      set({
        isLoading: false,
        activeAction: null,
        errorDialog: {
          title: '任务列表读取失败',
          message: getErrorMessage(error, '读取任务列表失败，请重试。'),
          source: 'hydrate',
        },
      })
    }
  },
  hydrateReminderPreferences: async (nowIso) => {
    set({
      isReminderPreferencesLoading: true,
    })

    try {
      const reminderPreferences = await loadReminderPreferences()
      set((state) => ({
        reminderPreferences,
        isReminderPreferencesLoading: false,
        ...buildReminderState(state.tasks, reminderPreferences, nowIso),
      }))
      void syncDesktopNotifications(get().tasks, reminderPreferences, nowIso)
    } catch (error) {
      set((state) => ({
        isReminderPreferencesLoading: false,
        errorDialog: {
          title: '提醒设置读取失败',
          message: getErrorMessage(error, '读取提醒设置失败，请稍后重试。'),
          source: 'reminder',
        },
        reminderBuckets: deriveReminderBuckets(state.tasks, state.reminderPreferences, getNowIso(nowIso)),
      }))
    }
  },
  saveReminderPreferences: async (input, nowIso) => {
    set({
      isSavingReminderPreferences: true,
      activeAction: 'reminder',
      errorDialog: null,
      successToast: null,
    })

    try {
      const reminderPreferences = await persistReminderPreferences(input)
      set((state) => ({
        reminderPreferences,
        isSavingReminderPreferences: false,
        activeAction: null,
        successToast: {
          tone: 'success',
          message: '提醒设置已保存。',
          source: 'reminder',
        },
        ...buildReminderState(state.tasks, reminderPreferences, nowIso),
      }))
      void syncDesktopNotifications(get().tasks, reminderPreferences, nowIso)
      return true
    } catch (error) {
      set({
        isSavingReminderPreferences: false,
        activeAction: null,
        errorDialog: {
          title: '提醒设置保存失败',
          message: getErrorMessage(error, '保存提醒设置失败，请稍后重试。'),
          source: 'reminder',
        },
      })
      return false
    }
  },
  refreshReminderBuckets: (nowIso) =>
    set((state) => {
      const reminderState = buildReminderState(state.tasks, state.reminderPreferences, nowIso)
      void syncDesktopNotifications(state.tasks, state.reminderPreferences, reminderState.reminderSnapshotAt)
      return reminderState
    }),
  startReminderAutoRefresh: () => {
    if (reminderAutoRefreshTimer) {
      return
    }

    get().refreshReminderBuckets()
    reminderAutoRefreshTimer = setInterval(() => {
      get().refreshReminderBuckets()
    }, 60_000)
  },
  stopReminderAutoRefresh: () => {
    if (!reminderAutoRefreshTimer) {
      return
    }

    clearInterval(reminderAutoRefreshTimer)
    reminderAutoRefreshTimer = null
  },
  dismissSuccessToast: () => set({ successToast: null }),
  closeErrorDialog: () => set({ errorDialog: null }),
  openTaskDetail: (taskId) => set({ editingTaskId: taskId }),
  closeTaskDetail: () => set({ editingTaskId: null }),
  setFilter: (filter) =>
    set((state) => ({
      activeFilter: filter,
      filteredTasks: buildVisibleTasks(state.tasks, {
        ...buildQuery(state),
        status: filter,
      }),
    })),
  setArchiveFilter: (filter) =>
    set((state) => ({
      activeArchiveFilter: filter,
      filteredTasks: buildVisibleTasks(state.tasks, {
        ...buildQuery(state),
        archive: filter,
      }),
    })),
  setGroupFilter: (filter) =>
    set((state) => ({
      activeGroupFilter: normalizeGroupFilter(state.taskGroups, filter),
      filteredTasks: buildVisibleTasks(state.tasks, {
        ...buildQuery(state),
        group: normalizeGroupFilter(state.taskGroups, filter),
      }),
    })),
  setPriorityFilter: (filter) =>
    set((state) => ({
      activePriorityFilter: filter,
      filteredTasks: buildVisibleTasks(state.tasks, {
        ...buildQuery(state),
        priority: filter,
      }),
    })),
  setDateRange: (filter) =>
    set((state) => ({
      activeDateRange: filter,
      filteredTasks: buildVisibleTasks(state.tasks, {
        ...buildQuery(state),
        dateRange: filter,
      }),
    })),
  setSortBy: (sortBy) =>
    set((state) => ({
      activeSortBy: sortBy,
      filteredTasks: buildVisibleTasks(state.tasks, {
        ...buildQuery(state),
        sortBy,
      }),
    })),
  resetFilters: () =>
    set((state) => ({
      activeFilter: DEFAULT_TASK_QUERY.status,
      activeArchiveFilter: DEFAULT_TASK_QUERY.archive,
      activeGroupFilter: DEFAULT_TASK_QUERY.group,
      activePriorityFilter: DEFAULT_TASK_QUERY.priority,
      activeDateRange: DEFAULT_TASK_QUERY.dateRange,
      activeSortBy: DEFAULT_TASK_QUERY.sortBy,
      filteredTasks: buildVisibleTasks(state.tasks, DEFAULT_TASK_QUERY),
    })),
  addTask: async (input) => {
    set({
      isMutating: true,
      activeAction: 'create',
      feedback: null,
      successToast: null,
      errorDialog: null,
    })

    try {
      const tasks = await createTask(input)
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isHydrated: true,
        activeAction: null,
        successToast: {
          tone: 'success',
          message: '任务已保存到本地清单。',
          source: 'create',
        },
        ...buildReminderState(tasks, state.reminderPreferences),
      }))
      void syncDesktopNotifications(tasks, get().reminderPreferences)
    } catch (error) {
      set({
        activeAction: null,
        errorDialog: {
          title: '任务创建失败',
          message: getErrorMessage(error, '新建任务失败，请稍后再试。'),
          source: 'create',
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  updateTask: async (input) => {
    set({
      isMutating: true,
      activeAction: 'update',
      feedback: null,
      successToast: null,
      errorDialog: null,
    })

    try {
      const tasks = await updateTask(input)
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isHydrated: true,
        activeAction: null,
        successToast: {
          tone: 'success',
          message: '任务修改已保存。',
          source: 'update',
        },
        ...buildReminderState(tasks, state.reminderPreferences),
      }))
      void syncDesktopNotifications(tasks, get().reminderPreferences)
    } catch (error) {
      set({
        activeAction: null,
        errorDialog: {
          title: '任务更新失败',
          message: getErrorMessage(error, '保存修改失败，请稍后再试。'),
          source: 'update',
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  toggleTask: async (taskId) => {
    const targetTask = get().tasks.find((task) => task.id === taskId)
    set({
      isMutating: true,
      activeAction: 'toggle',
      feedback: null,
      successToast: null,
      errorDialog: null,
    })

    try {
      const tasks = await toggleTask(taskId)
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isHydrated: true,
        activeAction: null,
        successToast: {
          tone: 'success',
          message: targetTask?.completed ? '任务已恢复为进行中。' : '任务已标记为完成。',
          source: 'toggle',
        },
        ...buildReminderState(tasks, state.reminderPreferences),
      }))
      void syncDesktopNotifications(tasks, get().reminderPreferences)
    } catch (error) {
      set({
        activeAction: null,
        errorDialog: {
          title: '任务状态更新失败',
          message: getErrorMessage(error, '更新任务状态失败，请稍后再试。'),
          source: 'toggle',
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  archiveTask: async (taskId) => {
    set({
      isMutating: true,
      activeAction: 'bulk',
      feedback: null,
      successToast: null,
      errorDialog: null,
    })

    try {
      const tasks = await bulkUpdateTasks({ taskIds: [taskId], archive: true })
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isHydrated: true,
        activeAction: null,
        successToast: {
          tone: 'success',
          message: '任务已归档。',
          source: 'bulk',
        },
        ...buildReminderState(tasks, state.reminderPreferences),
      }))
      void syncDesktopNotifications(tasks, get().reminderPreferences)
    } catch (error) {
      set({
        activeAction: null,
        errorDialog: {
          title: '归档失败',
          message: getErrorMessage(error, '归档失败，请稍后再试。'),
          source: 'bulk',
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  removeTask: async (taskId) => {
    set({
      isMutating: true,
      activeAction: 'remove',
      feedback: null,
      successToast: null,
      errorDialog: null,
    })

    try {
      const tasks = await deleteTask(taskId)
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isHydrated: true,
        activeAction: null,
        successToast: {
          tone: 'success',
          message: '任务已删除。',
          source: 'remove',
        },
        ...buildReminderState(tasks, state.reminderPreferences),
      }))
      void syncDesktopNotifications(tasks, get().reminderPreferences)
    } catch (error) {
      set({
        activeAction: null,
        errorDialog: {
          title: '任务删除失败',
          message: getErrorMessage(error, '删除任务失败，请稍后再试。'),
          source: 'remove',
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  updateTaskGroupAssignment: async (taskId, groupId) => {
    set({
      isMutating: true,
      activeAction: 'group',
      feedback: null,
      successToast: null,
      errorDialog: null,
    })

    try {
      const tasks = await assignTaskGroup(taskId, groupId)
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isHydrated: true,
        activeAction: null,
        successToast: {
          tone: 'success',
          message: groupId ? '任务已调整到新的任务组。' : '任务已移回未分组。',
          source: 'group',
        },
        ...buildReminderState(tasks, state.reminderPreferences),
      }))
      void syncDesktopNotifications(tasks, get().reminderPreferences)
    } catch (error) {
      set({
        activeAction: null,
        errorDialog: {
          title: '任务分组调整失败',
          message: getErrorMessage(error, '调整任务所属组失败，请稍后再试。'),
          source: 'group',
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  addTaskGroup: async (input) => {
    set({
      isMutating: true,
      activeAction: 'group',
      feedback: null,
      successToast: null,
      errorDialog: null,
    })

    try {
      const taskGroups = await createTaskGroup(input)
      set((state) => {
        const activeGroupFilter = normalizeGroupFilter(taskGroups, state.activeGroupFilter)
        return {
          taskGroups,
          activeGroupFilter,
          filteredTasks: buildVisibleTasks(state.tasks, {
            ...buildQuery(state),
            group: activeGroupFilter,
          }),
          activeAction: null,
          successToast: {
            tone: 'success',
            message: '任务组已创建。',
            source: 'group',
          },
        }
      })
    } catch (error) {
      set({
        activeAction: null,
        errorDialog: {
          title: '任务组创建失败',
          message: getErrorMessage(error, '创建任务组失败，请稍后再试。'),
          source: 'group',
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  updateTaskGroup: async (input) => {
    set({
      isMutating: true,
      activeAction: 'group',
      feedback: null,
      successToast: null,
      errorDialog: null,
    })

    try {
      const taskGroups = await updateTaskGroup(input)
      set((state) => {
        const activeGroupFilter = normalizeGroupFilter(taskGroups, state.activeGroupFilter)
        return {
          taskGroups,
          activeGroupFilter,
          filteredTasks: buildVisibleTasks(state.tasks, {
            ...buildQuery(state),
            group: activeGroupFilter,
          }),
          activeAction: null,
          successToast: {
            tone: 'success',
            message: '任务组已更新。',
            source: 'group',
          },
        }
      })
    } catch (error) {
      set({
        activeAction: null,
        errorDialog: {
          title: '任务组更新失败',
          message: getErrorMessage(error, '更新任务组失败，请稍后再试。'),
          source: 'group',
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  removeTaskGroup: async (groupId) => {
    set({
      isMutating: true,
      activeAction: 'group',
      feedback: null,
      successToast: null,
      errorDialog: null,
    })

    try {
      const [taskGroups, tasks] = await Promise.all([deleteTaskGroup(groupId), loadTasks()])
      set((state) => {
        const activeGroupFilter = normalizeGroupFilter(taskGroups, state.activeGroupFilter)
        return {
          taskGroups,
          tasks,
          activeGroupFilter,
          filteredTasks: buildVisibleTasks(tasks, {
            ...buildQuery(state),
            group: activeGroupFilter,
          }),
          activeAction: null,
          successToast: {
            tone: 'success',
            message: '任务组已删除，组内任务已移回未分组。',
            source: 'group',
          },
          ...buildReminderState(tasks, state.reminderPreferences),
        }
      })
      void syncDesktopNotifications(tasks, get().reminderPreferences)
    } catch (error) {
      set({
        activeAction: null,
        errorDialog: {
          title: '任务组删除失败',
          message: getErrorMessage(error, '删除任务组失败，请稍后再试。'),
          source: 'group',
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  toggleBulkMode: () =>
    set((state) => ({
      isBulkMode: !state.isBulkMode,
      selectedTaskIds: state.isBulkMode ? [] : state.selectedTaskIds,
    })),
  toggleTaskSelection: (taskId) =>
    set((state) => ({
      selectedTaskIds: state.selectedTaskIds.includes(taskId)
        ? state.selectedTaskIds.filter((id) => id !== taskId)
        : [...state.selectedTaskIds, taskId],
    })),
  clearTaskSelection: () => set({ selectedTaskIds: [] }),
  applyBulkArchive: async () => {
    const taskIds = get().selectedTaskIds
    set({
      isMutating: true,
      activeAction: 'bulk',
      feedback: null,
      successToast: null,
      errorDialog: null,
    })

    try {
      const tasks = await bulkUpdateTasks({ taskIds, archive: true })
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isBulkMode: false,
        selectedTaskIds: [],
        activeAction: null,
        successToast: {
          tone: 'success',
          message: '已归档选中任务。',
          source: 'bulk',
        },
        ...buildReminderState(tasks, state.reminderPreferences),
      }))
      void syncDesktopNotifications(tasks, get().reminderPreferences)
    } catch (error) {
      set({
        activeAction: null,
        errorDialog: {
          title: '归档失败',
          message: getErrorMessage(error, '归档失败，请稍后再试。'),
          source: 'bulk',
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  applyBulkUpdate: async (input) => {
    set({
      isMutating: true,
      activeAction: 'bulk',
      feedback: null,
      successToast: null,
      errorDialog: null,
    })

    try {
      const tasks = await bulkUpdateTasks(input)
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isBulkMode: false,
        selectedTaskIds: [],
        activeAction: null,
        successToast: {
          tone: 'success',
          message: '批量操作已完成。',
          source: 'bulk',
        },
        ...buildReminderState(tasks, state.reminderPreferences),
      }))
      void syncDesktopNotifications(tasks, get().reminderPreferences)
    } catch (error) {
      set({
        activeAction: null,
        errorDialog: {
          title: '批量更新失败',
          message: getErrorMessage(error, '批量操作失败，请稍后再试。'),
          source: 'bulk',
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  dismissFeedback: () => set({ feedback: null }),
  queueReminderNavigation: (taskId) =>
    set({
      reminderNavigation: {
        taskId,
        requestedAt: Date.now(),
      },
    }),
  clearReminderNavigation: () => set({ reminderNavigation: null }),
}))

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  if (typeof error === 'string' && error.trim()) {
    return error
  }

  return fallback
}
