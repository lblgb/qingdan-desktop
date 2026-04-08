/**
 * 文件说明：统一管理任务状态和基本操作，当前阶段通过异步数据访问层衔接 Tauri 命令。
 */
import { create } from 'zustand'
import { createTask, deleteTask, loadTasks, toggleTask, updateTask } from '../features/tasks/task.storage'
import type { CreateTaskInput, TaskFilter, TaskItem, UpdateTaskInput } from '../features/tasks/task.types'

interface TaskState {
  tasks: TaskItem[]
  activeFilter: TaskFilter
  filteredTasks: TaskItem[]
  isHydrated: boolean
  isMutating: boolean
  hydrateTasks: () => Promise<void>
  setFilter: (filter: TaskFilter) => void
  addTask: (input: CreateTaskInput) => Promise<void>
  updateTask: (input: UpdateTaskInput) => Promise<void>
  toggleTask: (taskId: string) => Promise<void>
  removeTask: (taskId: string) => Promise<void>
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
  isMutating: false,
  hydrateTasks: async () => {
    if (get().isHydrated) {
      return
    }

    const tasks = await loadTasks()
    set((state) => ({
      tasks,
      filteredTasks: buildFilteredTasks(tasks, state.activeFilter),
      isHydrated: true,
    }))
  },
  setFilter: (filter) =>
    set((state) => ({
      activeFilter: filter,
      filteredTasks: buildFilteredTasks(state.tasks, filter),
    })),
  addTask: async (input) => {
    set({ isMutating: true })
    try {
      const tasks = await createTask(input)
      set((state) => ({
        tasks,
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter),
        isHydrated: true,
      }))
    } finally {
      set({ isMutating: false })
    }
  },
  updateTask: async (input) => {
    set({ isMutating: true })
    try {
      const tasks = await updateTask(input)
      set((state) => ({
        tasks,
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter),
        isHydrated: true,
      }))
    } finally {
      set({ isMutating: false })
    }
  },
  toggleTask: async (taskId) => {
    set({ isMutating: true })
    try {
      const tasks = await toggleTask(taskId)
      set((state) => ({
        tasks,
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter),
        isHydrated: true,
      }))
    } finally {
      set({ isMutating: false })
    }
  },
  removeTask: async (taskId) => {
    set({ isMutating: true })
    try {
      const tasks = await deleteTask(taskId)
      set((state) => ({
        tasks,
        filteredTasks: buildFilteredTasks(tasks, state.activeFilter),
        isHydrated: true,
      }))
    } finally {
      set({ isMutating: false })
    }
  },
}))
