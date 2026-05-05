export type RecurringCadenceUnit = 'minute' | 'hour' | 'day' | 'week'

export interface RecurringTask {
  id: string
  title: string
  description: string
  cadenceUnit: RecurringCadenceUnit
  cadenceInterval: number
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

export interface RecurringProgressEntry {
  id: string
  periodId: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface CreateRecurringTaskInput {
  title: string
  description: string
  cadenceUnit: RecurringCadenceUnit
  cadenceInterval: number
  remindAtEnd: boolean
}

export interface UpdateRecurringTaskInput extends CreateRecurringTaskInput {
  id: string
  isActive: boolean
}

export interface CreateRecurringProgressEntryInput {
  periodId: string
  content: string
}

export interface UpdateRecurringProgressEntryInput {
  id: string
  content: string
}
