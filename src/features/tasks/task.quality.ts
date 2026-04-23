import type { TaskItem } from './task.types'

export const TASK_QUALITY_WARNINGS = {
  shortTitle: '标题较短，后续可能不易回忆任务背景。',
  duplicateTitle: '存在标题相同的任务，建议确认是否重复。',
  highPriorityWithoutNote: '高优先级任务建议补充备注，方便回看处理背景。',
} as const

export function getTaskQualityWarnings(task: TaskItem, allTasks: TaskItem[]) {
  const warnings: string[] = []
  const normalizedTitle = task.title.trim()

  if (normalizedTitle.length >= 1 && normalizedTitle.length <= 3) {
    warnings.push(TASK_QUALITY_WARNINGS.shortTitle)
  }

  if (
    normalizedTitle &&
    allTasks.some((candidate) => candidate.id !== task.id && candidate.title.trim() === normalizedTitle)
  ) {
    warnings.push(TASK_QUALITY_WARNINGS.duplicateTitle)
  }

  if ((task.priority === 'urgent' || task.priority === 'high') && !task.note.trim()) {
    warnings.push(TASK_QUALITY_WARNINGS.highPriorityWithoutNote)
  }

  return warnings
}
