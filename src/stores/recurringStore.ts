import { create } from 'zustand'
import { buildRecurringOverview } from '../features/recurring/recurring.overview'
import {
  createRecurringTask,
  createRecurringTimeEntry,
  deleteRecurringTask,
  deleteRecurringTimeEntry,
  listRecurringPeriods,
  listRecurringTasks,
  listRecurringTimeEntries,
  updateRecurringTask,
  updateRecurringTimeEntryNote,
} from '../features/recurring/recurring.storage'
import type {
  CreateRecurringTaskInput,
  CreateRecurringTimeEntryInput,
  RecurringPeriod,
  RecurringTask,
  RecurringTimeEntry,
  UpdateRecurringTaskInput,
  UpdateRecurringTimeEntryNoteInput,
} from '../features/recurring/recurring.types'

interface RecurringState {
  tasks: RecurringTask[]
  periodsByTaskId: Record<string, RecurringPeriod[]>
  timeEntriesByPeriodId: Record<string, RecurringTimeEntry[]>
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
  addTimeEntry: (input: CreateRecurringTimeEntryInput) => Promise<void>
  saveTimeEntryNote: (input: UpdateRecurringTimeEntryNoteInput) => Promise<void>
  removeTimeEntry: (entryId: string) => Promise<void>
  overview: (nowIso?: string) => ReturnType<typeof buildRecurringOverview>
}

export const useRecurringStore = create<RecurringState>((set, get) => ({
  tasks: [],
  periodsByTaskId: {},
  timeEntriesByPeriodId: {},
  selectedTaskId: null,
  selectedPeriodId: null,
  isCenterOpen: false,
  isLoading: false,
  isMutating: false,
  hydrate: async () => {
    set({ isLoading: true })
    const tasks = await listRecurringTasks()
    const periodPairs = await Promise.all(tasks.map(async (task) => [task.id, await listRecurringPeriods(task.id)] as const))
    const periodsByTaskId = Object.fromEntries(periodPairs)
    const entryPairs = await Promise.all(
      periodPairs.flatMap(([, periods]) => periods.map(async (period) => [period.id, await listRecurringTimeEntries(period.id)] as const)),
    )
    const timeEntriesByPeriodId = Object.fromEntries(entryPairs)
    const selectedTaskId = get().selectedTaskId ?? tasks[0]?.id ?? null
    set({
      tasks,
      periodsByTaskId,
      timeEntriesByPeriodId,
      isLoading: false,
      selectedTaskId,
      selectedPeriodId: selectedTaskId ? periodsByTaskId[selectedTaskId]?.[0]?.id ?? null : null,
    })
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
    const entries = await listRecurringTimeEntries(periodId)
    set((state) => ({
      selectedPeriodId: periodId,
      timeEntriesByPeriodId: {
        ...state.timeEntriesByPeriodId,
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
      const timeEntriesByPeriodId = { ...state.timeEntriesByPeriodId }
      delete periodsByTaskId[taskId]
      for (const period of removedPeriods) {
        delete timeEntriesByPeriodId[period.id]
      }
      const selectedTaskId = state.selectedTaskId === taskId ? tasks[0]?.id ?? null : state.selectedTaskId
      return {
        tasks,
        periodsByTaskId,
        timeEntriesByPeriodId,
        selectedTaskId,
        selectedPeriodId: selectedTaskId === state.selectedTaskId ? state.selectedPeriodId : null,
        isMutating: false,
      }
    })
  },
  addTimeEntry: async (input) => {
    set({ isMutating: true })
    const entries = await createRecurringTimeEntry(input)
    set((state) => ({
      isMutating: false,
      timeEntriesByPeriodId: {
        ...state.timeEntriesByPeriodId,
        [input.periodId]: entries,
      },
    }))
  },
  saveTimeEntryNote: async (input) => {
    set({ isMutating: true })
    const periodId = Object.keys(get().timeEntriesByPeriodId).find((key) =>
      (get().timeEntriesByPeriodId[key] ?? []).some((entry) => entry.id === input.id),
    )
    const entries = await updateRecurringTimeEntryNote(input)
    if (!periodId) {
      set({ isMutating: false })
      return
    }
    set((state) => ({
      isMutating: false,
      timeEntriesByPeriodId: {
        ...state.timeEntriesByPeriodId,
        [periodId]: entries,
      },
    }))
  },
  removeTimeEntry: async (entryId) => {
    set({ isMutating: true })
    const periodId = Object.keys(get().timeEntriesByPeriodId).find((key) =>
      (get().timeEntriesByPeriodId[key] ?? []).some((entry) => entry.id === entryId),
    )
    const entries = await deleteRecurringTimeEntry(entryId)
    if (!periodId) {
      set({ isMutating: false })
      return
    }

    set((state) => ({
      isMutating: false,
      timeEntriesByPeriodId: {
        ...state.timeEntriesByPeriodId,
        [periodId]: entries,
      },
    }))
  },
  overview: (nowIso = new Date().toISOString()) =>
    buildRecurringOverview(get().tasks, get().periodsByTaskId, get().timeEntriesByPeriodId, nowIso),
}))
