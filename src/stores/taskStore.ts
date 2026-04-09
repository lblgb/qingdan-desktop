/**
 * 文件说明：统一管理任务状态和基本操作，当前阶段通过异步数据访问层衔接 Tauri 命令。
 */
import { create } from 'zustand'
import {
  assignTaskGroup,
  createTask,
  createTaskGroup,
  deleteTask,
  deleteTaskGroup,
  loadTaskGroups,
  loadTasks,
  toggleTask,
  updateTask,
  updateTaskGroup,
} from '../features/tasks/task.storage'
import type {
  CreateTaskGroupInput,
  CreateTaskInput,
  TaskFilter,
  TaskGroup,
  TaskGroupFilter,
  TaskItem,
  UpdateTaskGroupInput,
  UpdateTaskInput,
} from '../features/tasks/task.types'

type TaskAction = 'hydrate' | 'create' | 'update' | 'toggle' | 'remove' | 'group'
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
  filteredTasks: TaskItem[]
  isHydrated: boolean
  isLoading: boolean
  isMutating: boolean
  activeAction: TaskAction | null
  feedback: TaskFeedback | null
  hydrateTasks: () => Promise<void>
  setFilter: (filter: TaskFilter) => void
  setGroupFilter: (filter: TaskGroupFilter) => void
  addTask: (input: CreateTaskInput) => Promise<void>
  updateTask: (input: UpdateTaskInput) => Promise<void>
  toggleTask: (taskId: string) => Promise<void>
  removeTask: (taskId: string) => Promise<void>
  updateTaskGroupAssignment: (taskId: string, groupId: string | null) => Promise<void>
  addTaskGroup: (input: CreateTaskGroupInput) => Promise<void>
  updateTaskGroup: (input: UpdateTaskGroupInput) => Promise<void>
  removeTaskGroup: (groupId: string) => Promise<void>
  dismissFeedback: () => void
}

function applyStatusFilter(tasks: TaskItem[], filter: TaskFilter) {
  if (filter === 'active') {
    return tasks.filter((task) => !task.completed)
  }

  if (filter === 'completed') {
    return tasks.filter((task) => task.completed)
  }

  return tasks
}

function applyGroupFilter(tasks: TaskItem[], filter: TaskGroupFilter) {
  if (filter === 'all-groups') {
    return tasks
  }

  if (filter === 'ungrouped') {
    return tasks.filter((task) => !task.groupId)
  }

  return tasks.filter((task) => task.groupId === filter)
}

function buildFilteredTasks(tasks: TaskItem[], statusFilter: TaskFilter, groupFilter: TaskGroupFilter) {
  return applyGroupFilter(applyStatusFilter(tasks, statusFilter), groupFilter)
}

function normalizeGroupFilter(taskGroups: TaskGroup[], activeGroupFilter: TaskGroupFilter): TaskGroupFilter {
  if (activeGroupFilter === 'all-groups' || activeGroupFilter === 'ungrouped') {
    return activeGroupFilter
  }

  return taskGroups.some((group) => group.id === activeGroupFilter) ? activeGroupFilter : 'all-groups'
}

/**
 * 任务状态仓库。
 */
export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  taskGroups: [],
  activeFilter: 'all',
  activeGroupFilter: 'all-groups',
  filteredTasks: [],
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
      const [tasks, taskGroups] = await Promise.all([loadTasks(), loadTaskGroups()])
      set((state) => ({
        tasks,
        taskGroups,
        activeGroupFilter: normalizeGroupFilter(taskGroups, state.activeGroupFilter),
        filteredTasks: buildFilteredTasks(
          tasks,
          state.activeFilter,
          normalizeGroupFilter(taskGroups, state.activeGroupFilter),
        ),
        isHydrated: true,
        isLoading: false,
        activeAction: null,
      }))
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
      filteredTasks: buildFilteredTasks(state.tasks, filter, state.activeGroupFilter),
    })),
  setGroupFilter: (filter) =>
    set((state) => ({
      activeGroupFilter: normalizeGroupFilter(state.taskGroups, filter),
      filteredTasks: buildFilteredTasks(
        state.tasks,
        state.activeFilter,
        normalizeGroupFilter(state.taskGroups, filter),
      ),
    })),
  addTask: async (input) => {
    set({ isMutating: true, activeAction: 'create', feedback: null })
    try {
      const tasks = await createTask(input)
      set((state) => ({
        tasks,
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter, state.activeGroupFilter),
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
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter, state.activeGroupFilter),
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
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter, state.activeGroupFilter),
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
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter, state.activeGroupFilter),
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
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter, state.activeGroupFilter),
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
      set((state) => ({
        taskGroups,
        activeGroupFilter: normalizeGroupFilter(taskGroups, state.activeGroupFilter),
        filteredTasks: buildFilteredTasks(
          state.tasks,
          state.activeFilter,
          normalizeGroupFilter(taskGroups, state.activeGroupFilter),
        ),
        activeAction: null,
        feedback: {
          tone: 'success',
          message: '任务组已创建。',
        },
      }))
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
      set((state) => ({
        taskGroups,
        activeGroupFilter: normalizeGroupFilter(taskGroups, state.activeGroupFilter),
        filteredTasks: buildFilteredTasks(
          state.tasks,
          state.activeFilter,
          normalizeGroupFilter(taskGroups, state.activeGroupFilter),
        ),
        activeAction: null,
        feedback: {
          tone: 'success',
          message: '任务组已更新。',
        },
      }))
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
        const nextGroupFilter = normalizeGroupFilter(taskGroups, state.activeGroupFilter)

        return {
          taskGroups,
          tasks,
          activeGroupFilter: nextGroupFilter,
          filteredTasks: buildFilteredTasks(tasks, state.activeFilter, nextGroupFilter),
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
