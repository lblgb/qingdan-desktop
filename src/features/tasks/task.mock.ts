/**
 * 文件说明：提供任务模块的初始演示数据，便于项目骨架阶段快速预览界面。
 */
import type { TaskItem } from './task.types'

/**
 * 默认任务列表。
 */
export const defaultTasks: TaskItem[] = [
  {
    id: 'task-1',
    title: '确定第一版技术栈',
    description: '已确认采用 Tauri + React + TypeScript 作为项目基础。',
    completed: true,
    groupId: null,
    dueAt: null,
    createdAt: '2026-04-05T13:30:00.000Z',
    updatedAt: '2026-04-05T14:30:00.000Z',
  },
  {
    id: 'task-2',
    title: '搭建项目骨架',
    description: '完成前端目录分层、状态管理和 Tauri 模板文件。',
    completed: false,
    groupId: null,
    dueAt: '2026-04-06',
    createdAt: '2026-04-05T14:00:00.000Z',
    updatedAt: '2026-04-05T14:00:00.000Z',
  },
]
