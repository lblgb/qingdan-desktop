/**
 * 文件说明：提供任务标题与备注的轻量搜索和结果排序能力。
 */
import type { TaskItem, TaskSearchResult } from './task.types'

function normalize(value: string) {
  return value.trim().toLowerCase()
}

export function searchTasks(tasks: TaskItem[], keyword: string): TaskSearchResult[] {
  const normalizedKeyword = normalize(keyword)
  if (!normalizedKeyword) {
    return []
  }

  const results: TaskSearchResult[] = []

  for (const task of tasks) {
    const title = normalize(task.title)
    const note = normalize(task.note)

    if (title.includes(normalizedKeyword)) {
      results.push({ task, matchedField: 'title' })
      continue
    }

    if (note.includes(normalizedKeyword)) {
      results.push({ task, matchedField: 'note' })
    }
  }

  return results
    .sort((left, right) => {
      if (left.matchedField !== right.matchedField) {
        return left.matchedField === 'title' ? -1 : 1
      }

      return right.task.updatedAt.localeCompare(left.task.updatedAt)
    })
}
