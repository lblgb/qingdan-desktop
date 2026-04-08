/**
 * 文件说明：统一管理任务状态和基本操作，当前阶段通过异步数据访问层衔接 Tauri 命令。
 */
import { create } from 'zustand'
import { createTask, deleteTask, loadTasks, toggleTask, updateTask } from '../features/tasks/task.storage'
import type { CreateTaskInput, TaskFilter, TaskItem, UpdateTaskInput } from '../features/tasks/task.types'

type TaskAction = 'hydrate' | 'create' | 'update' | 'toggle' | 'remove'
type TaskFeedbackTone = 'success' | 'error'

interface TaskFeedback {
  tone: TaskFeedbackTone
  message: string
}

interface TaskState {
  tasks: TaskItem[]
  activeFilter: TaskFilter
  filteredTasks: TaskItem[]
  isHydrated: boolean
  isLoading: boolean
  isMutating: boolean
  activeAction: TaskAction | null
  feedback: TaskFeedback | null
  hydrateTasks: () => Promise<void>
  setFilter: (filter: TaskFilter) => void
  addTask: (input: CreateTaskInput) => Promise<void>
  updateTask: (input: UpdateTaskInput) => Promise<void>
  toggleTask: (taskId: string) => Promise<void>
  removeTask: (taskId: string) => Promise<void>
  dismissFeedback: () => void
}

function buildFilteredTasks(tasks: TaskItem[], filter: TaskFilter) {
  if (filter === 'active') {
    return tasks.filter((task) => !task.completed)
  }

  if (filter === 'completed') {
    return tasks.filter((task) => task.completed)
  }

  return tasks
}

/**
 * 任务状态仓库。
 */
export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  activeFilter: 'all',
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
      const tasks = await loadTasks()
      set((state) => ({
        tasks,
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter),
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
      filteredTasks: buildFilteredTasks(state.tasks, filter),
    })),
  addTask: async (input) => {
    set({ isMutating: true, activeAction: 'create', feedback: null })
    try {
      const tasks = await createTask(input)
      set((state) => ({
        tasks,
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter),
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
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter),
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
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter),
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
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter),
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
