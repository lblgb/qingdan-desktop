/**
 * 文件说明：集中定义任务优先级的展示元信息与排序权重。
 */
import type { TaskPriority } from './task.types'

export const TASK_PRIORITY_META: Record<
  TaskPriority,
  { label: string; shortLabel: string; weight: number }
> = {
  urgent: {
    label: '紧急',
    shortLabel: '紧急',
    weight: 0,
  },
  high: {
    label: '高',
    shortLabel: '高',
    weight: 1,
  },
  medium: {
    label: '中',
    shortLabel: '中',
    weight: 2,
  },
  low: {
    label: '低',
    shortLabel: '低',
    weight: 3,
  },
}
