export type RecurringCadenceUnit = 'minute' | 'hour' | 'day' | 'week'

export interface RecurringTask {
  id: string
  title: string
  description: string
  cadenceUnit: RecurringCadenceUnit
  cadenceInterval: number
  targetMinutesPerPeriod: number
  remindAtEnd: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface RecurringPeriod {
  id: string
  taskId: string
  startAt: string
  endAt: string
  closedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface RecurringTimeEntry {
  id: string
  periodId: string
  startedAt: string
  endedAt: string
  durationMinutes: number
  note: string
  createdAt: string
  updatedAt: string
}

export interface CreateRecurringTaskInput {
  title: string
  description: string
  cadenceUnit: RecurringCadenceUnit
  cadenceInterval: number
  targetMinutesPerPeriod: number
  remindAtEnd: boolean
}

export interface UpdateRecurringTaskInput extends CreateRecurringTaskInput {
  id: string
  isActive: boolean
}

export interface CreateRecurringTimeEntryInput {
  periodId: string
  startedAt: string
  endedAt: string
  durationMinutes: number
  note: string
}

export interface UpdateRecurringTimeEntryNoteInput {
  id: string
  note: string
}

export interface RecurringTimerSession {
  taskId: string
  periodId: string
  startedAt: string
  runningSince: string
  pausedAccumulatedMs: number
  isPaused: boolean
}
