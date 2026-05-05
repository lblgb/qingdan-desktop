import { create } from 'zustand'
import { buildRecurringOverview } from '../features/recurring/recurring.overview'
import {
  createRecurringProgressEntry,
  createRecurringTask,
  deleteRecurringTask,
  listRecurringPeriods,
  listRecurringProgressEntries,
  listRecurringTasks,
  updateRecurringProgressEntry,
  updateRecurringTask,
} from '../features/recurring/recurring.storage'
import type {
  CreateRecurringProgressEntryInput,
  CreateRecurringTaskInput,
  RecurringPeriod,
  RecurringProgressEntry,
  RecurringTask,
  UpdateRecurringProgressEntryInput,
  UpdateRecurringTaskInput,
} from '../features/recurring/recurring.types'

interface RecurringState {
  tasks: RecurringTask[]
  periodsByTaskId: Record<string, RecurringPeriod[]>
  entriesByPeriodId: Record<string, RecurringProgressEntry[]>
  selectedTaskId: string | null
  selectedPeriodId: string | null
  isCenterOpen: boolean
  isLoading: boolean
  isMutating: boolean
  hydrate: () => Promise<void>
  openCenter: () => void
  closeCenter: () => void
  selectTask: (taskId: string) => Promise<void>
  selectPeriod: (periodId: string) => Promise<void>
  addTask: (input: CreateRecurringTaskInput) => Promise<void>
  saveTask: (input: UpdateRecurringTaskInput) => Promise<void>
  removeTask: (taskId: string) => Promise<void>
  addEntry: (input: CreateRecurringProgressEntryInput) => Promise<void>
  saveEntry: (input: UpdateRecurringProgressEntryInput) => Promise<void>
  overview: (nowIso?: string) => ReturnType<typeof buildRecurringOverview>
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
  tasks: [],
  periodsByTaskId: {},
  entriesByPeriodId: {},
  selectedTaskId: null,
  selectedPeriodId: null,
  isCenterOpen: false,
  isLoading: false,
  isMutating: false,
  hydrate: async () => {
    set({ isLoading: true })
    const tasks = await listRecurringTasks()
    set({
      tasks,
      isLoading: false,
      selectedTaskId: get().selectedTaskId ?? tasks[0]?.id ?? null,
    })
    if ((get().selectedTaskId ?? tasks[0]?.id) != null) {
      await get().selectTask(get().selectedTaskId ?? tasks[0].id)
    }
  },
  openCenter: () => set({ isCenterOpen: true }),
  closeCenter: () => set({ isCenterOpen: false }),
  selectTask: async (taskId) => {
    const periods = await listRecurringPeriods(taskId)
    set((state) => ({
      selectedTaskId: taskId,
      selectedPeriodId: periods[0]?.id ?? null,
      periodsByTaskId: {
        ...state.periodsByTaskId,
        [taskId]: periods,
      },
    }))
    if (periods[0]?.id) {
      await get().selectPeriod(periods[0].id)
    }
  },
  selectPeriod: async (periodId) => {
    const entries = await listRecurringProgressEntries(periodId)
    set((state) => ({
      selectedPeriodId: periodId,
      entriesByPeriodId: {
        ...state.entriesByPeriodId,
        [periodId]: entries,
      },
    }))
  },
  addTask: async (input) => {
    set({ isMutating: true })
    const tasks = await createRecurringTask(input)
    const selectedTaskId = tasks[0]?.id ?? null
    set({ tasks, selectedTaskId, isMutating: false })
    if (selectedTaskId) {
      await get().selectTask(selectedTaskId)
    }
  },
  saveTask: async (input) => {
    set({ isMutating: true })
    const tasks = await updateRecurringTask(input)
    set({ tasks, isMutating: false })
    await get().selectTask(input.id)
  },
  removeTask: async (taskId) => {
    set({ isMutating: true })
    const removedPeriods = get().periodsByTaskId[taskId] ?? []
    const tasks = await deleteRecurringTask(taskId)
    set((state) => {
      const periodsByTaskId = { ...state.periodsByTaskId }
      const entriesByPeriodId = { ...state.entriesByPeriodId }
      delete periodsByTaskId[taskId]
      for (const period of removedPeriods) {
        delete entriesByPeriodId[period.id]
      }
      const selectedTaskId = state.selectedTaskId === taskId ? tasks[0]?.id ?? null : state.selectedTaskId
      return {
        tasks,
        periodsByTaskId,
        entriesByPeriodId,
        selectedTaskId,
        selectedPeriodId: selectedTaskId === state.selectedTaskId ? state.selectedPeriodId : null,
        isMutating: false,
      }
    })
  },
  addEntry: async (input) => {
    set({ isMutating: true })
    const entries = await createRecurringProgressEntry(input)
    set((state) => ({
      isMutating: false,
      entriesByPeriodId: {
        ...state.entriesByPeriodId,
        [input.periodId]: entries,
      },
    }))
  },
  saveEntry: async (input) => {
    set({ isMutating: true })
    const periodId = Object.keys(get().entriesByPeriodId).find((key) =>
      (get().entriesByPeriodId[key] ?? []).some((entry) => entry.id === input.id),
    )
    const entries = await updateRecurringProgressEntry(input)
    if (!periodId) {
      set({ isMutating: false })
      return
    }
    set((state) => ({
      isMutating: false,
      entriesByPeriodId: {
        ...state.entriesByPeriodId,
        [periodId]: entries,
      },
    }))
  },
  overview: (nowIso = new Date().toISOString()) =>
    buildRecurringOverview(get().tasks, get().periodsByTaskId, get().entriesByPeriodId, nowIso),
}))
