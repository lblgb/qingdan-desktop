/**
 * 文件说明：统一管理任务状态、更多条件查询状态和批量模式。
 */
import { create } from 'zustand'
import { applyTaskQuery, DEFAULT_TASK_QUERY } from '../features/tasks/task.filters'
import {
  assignTaskGroup,
  bulkUpdateTasks,
  createTask,
  createTaskGroup,
  deleteTask,
  deleteTaskGroup,
  loadTaskGroups,
  loadTasks,
  queryTasks,
  toggleTask,
  updateTask,
  updateTaskGroup,
} from '../features/tasks/task.storage'
import type {
  BulkUpdateTasksInput,
  CreateTaskGroupInput,
  CreateTaskInput,
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

type TaskAction = 'hydrate' | 'create' | 'update' | 'toggle' | 'remove' | 'group' | 'bulk'
type TaskFeedbackTone = 'success' | 'error'

interface TaskFeedback {
  tone: TaskFeedbackTone
  message: string
}

interface TaskState {
  tasks: TaskItem[]
  taskGroups: TaskGroup[]
  activeFilter: TaskFilter
  activeGroupFilter: TaskGroupFilter
  activePriorityFilter: TaskPriorityFilter
  activeDateRange: TaskDateRangeFilter
  activeSortBy: TaskSortBy
  filteredTasks: TaskItem[]
  isBulkMode: boolean
  selectedTaskIds: string[]
  isHydrated: boolean
  isLoading: boolean
  isMutating: boolean
  activeAction: TaskAction | null
  feedback: TaskFeedback | null
  hydrateTasks: () => Promise<void>
  setFilter: (filter: TaskFilter) => void
  setGroupFilter: (filter: TaskGroupFilter) => void
  setPriorityFilter: (filter: TaskPriorityFilter) => void
  setDateRange: (filter: TaskDateRangeFilter) => void
  setSortBy: (sortBy: TaskSortBy) => void
  addTask: (input: CreateTaskInput) => Promise<void>
  updateTask: (input: UpdateTaskInput) => Promise<void>
  toggleTask: (taskId: string) => Promise<void>
  removeTask: (taskId: string) => Promise<void>
  updateTaskGroupAssignment: (taskId: string, groupId: string | null) => Promise<void>
  addTaskGroup: (input: CreateTaskGroupInput) => Promise<void>
  updateTaskGroup: (input: UpdateTaskGroupInput) => Promise<void>
  removeTaskGroup: (groupId: string) => Promise<void>
  toggleBulkMode: () => void
  toggleTaskSelection: (taskId: string) => void
  clearTaskSelection: () => void
  applyBulkUpdate: (input: BulkUpdateTasksInput) => Promise<void>
  dismissFeedback: () => void
}

function buildVisibleTasks(tasks: TaskItem[], query: TaskQueryInput) {
  return applyTaskQuery(tasks, query)
}

function normalizeGroupFilter(taskGroups: TaskGroup[], activeGroupFilter: TaskGroupFilter): TaskGroupFilter {
  if (activeGroupFilter === 'all-groups' || activeGroupFilter === 'ungrouped') {
    return activeGroupFilter
  }

  return taskGroups.some((group) => group.id === activeGroupFilter) ? activeGroupFilter : 'all-groups'
}

function buildQuery(state: Pick<TaskState, 'activeFilter' | 'activeGroupFilter' | 'activePriorityFilter' | 'activeDateRange' | 'activeSortBy'>): TaskQueryInput {
  return {
    status: state.activeFilter,
    group: state.activeGroupFilter,
    priority: state.activePriorityFilter,
    dateRange: state.activeDateRange,
    sortBy: state.activeSortBy,
  }
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  taskGroups: [],
  activeFilter: DEFAULT_TASK_QUERY.status,
  activeGroupFilter: DEFAULT_TASK_QUERY.group,
  activePriorityFilter: DEFAULT_TASK_QUERY.priority,
  activeDateRange: DEFAULT_TASK_QUERY.dateRange,
  activeSortBy: DEFAULT_TASK_QUERY.sortBy,
  filteredTasks: [],
  isBulkMode: false,
  selectedTaskIds: [],
  isHydrated: false,
  isLoading: false,
  isMutating: false,
  activeAction: null,
  feedback: null,
  hydrateTasks: async () => {
    if (get().isHydrated || get().isLoading) {
      return
    }

    set({ isLoading: true, activeAction: 'hydrate', feedback: null })

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
        }
      })
    } catch (error) {
      set({
        isLoading: false,
        activeAction: null,
        feedback: {
          tone: 'error',
          message: getErrorMessage(error, '读取任务列表失败，请重试。'),
        },
      })
    }
  },
  setFilter: (filter) =>
    set((state) => ({
      activeFilter: filter,
      filteredTasks: buildVisibleTasks(state.tasks, {
        ...buildQuery(state),
        status: filter,
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
  addTask: async (input) => {
    set({ isMutating: true, activeAction: 'create', feedback: null })
    try {
      const tasks = await createTask(input)
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isHydrated: true,
        activeAction: null,
        feedback: {
          tone: 'success',
          message: '任务已保存到本地清单。',
        },
      }))
    } catch (error) {
      set({
        activeAction: null,
        feedback: {
          tone: 'error',
          message: getErrorMessage(error, '新建任务失败，请稍后再试。'),
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  updateTask: async (input) => {
    set({ isMutating: true, activeAction: 'update', feedback: null })
    try {
      const tasks = await updateTask(input)
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isHydrated: true,
        activeAction: null,
        feedback: {
          tone: 'success',
          message: '任务修改已保存。',
        },
      }))
    } catch (error) {
      set({
        activeAction: null,
        feedback: {
          tone: 'error',
          message: getErrorMessage(error, '保存修改失败，请稍后再试。'),
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  toggleTask: async (taskId) => {
    const targetTask = get().tasks.find((task) => task.id === taskId)
    set({ isMutating: true, activeAction: 'toggle', feedback: null })
    try {
      const tasks = await toggleTask(taskId)
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isHydrated: true,
        activeAction: null,
        feedback: {
          tone: 'success',
          message: targetTask?.completed ? '任务已恢复为进行中。' : '任务已标记为完成。',
        },
      }))
    } catch (error) {
      set({
        activeAction: null,
        feedback: {
          tone: 'error',
          message: getErrorMessage(error, '更新任务状态失败，请稍后再试。'),
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  removeTask: async (taskId) => {
    set({ isMutating: true, activeAction: 'remove', feedback: null })
    try {
      const tasks = await deleteTask(taskId)
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isHydrated: true,
        activeAction: null,
        feedback: {
          tone: 'success',
          message: '任务已删除。',
        },
      }))
    } catch (error) {
      set({
        activeAction: null,
        feedback: {
          tone: 'error',
          message: getErrorMessage(error, '删除任务失败，请稍后再试。'),
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  updateTaskGroupAssignment: async (taskId, groupId) => {
    set({ isMutating: true, activeAction: 'group', feedback: null })
    try {
      const tasks = await assignTaskGroup(taskId, groupId)
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isHydrated: true,
        activeAction: null,
        feedback: {
          tone: 'success',
          message: groupId ? '任务已调整到新的任务组。' : '任务已移回未分组。',
        },
      }))
    } catch (error) {
      set({
        activeAction: null,
        feedback: {
          tone: 'error',
          message: getErrorMessage(error, '调整任务所属组失败，请稍后再试。'),
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  addTaskGroup: async (input) => {
    set({ isMutating: true, activeAction: 'group', feedback: null })
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
          feedback: {
            tone: 'success',
            message: '任务组已创建。',
          },
        }
      })
    } catch (error) {
      set({
        activeAction: null,
        feedback: {
          tone: 'error',
          message: getErrorMessage(error, '创建任务组失败，请稍后再试。'),
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  updateTaskGroup: async (input) => {
    set({ isMutating: true, activeAction: 'group', feedback: null })
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
          feedback: {
            tone: 'success',
            message: '任务组已更新。',
          },
        }
      })
    } catch (error) {
      set({
        activeAction: null,
        feedback: {
          tone: 'error',
          message: getErrorMessage(error, '更新任务组失败，请稍后再试。'),
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  removeTaskGroup: async (groupId) => {
    set({ isMutating: true, activeAction: 'group', feedback: null })
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
          feedback: {
            tone: 'success',
            message: '任务组已删除，组内任务已移回未分组。',
          },
        }
      })
    } catch (error) {
      set({
        activeAction: null,
        feedback: {
          tone: 'error',
          message: getErrorMessage(error, '删除任务组失败，请稍后再试。'),
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
  applyBulkUpdate: async (input) => {
    set({ isMutating: true, activeAction: 'bulk', feedback: null })
    try {
      const tasks = await bulkUpdateTasks(input)
      set((state) => ({
        tasks,
        filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
        isBulkMode: false,
        selectedTaskIds: [],
        activeAction: null,
        feedback: {
          tone: 'success',
          message: '批量操作已完成。',
        },
      }))
    } catch (error) {
      set({
        activeAction: null,
        feedback: {
          tone: 'error',
          message: getErrorMessage(error, '批量操作失败，请稍后再试。'),
        },
      })
    } finally {
      set({ isMutating: false })
    }
  },
  dismissFeedback: () => set({ feedback: null }),
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
