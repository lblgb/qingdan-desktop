// @vitest-environment jsdom

import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TaskGroup, TaskItem, UpdateTaskInput } from '../features/tasks/task.types'
import { TaskDetailDialog } from './TaskDetailDialog'

;(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function buildTask(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: 'task-1',
    title: '准备周报',
    description: '',
    note: '',
    completed: false,
    completedAt: null,
    archivedAt: null,
    groupId: null,
    dueAt: null,
    priority: 'medium',
    createdAt: '2026-04-16T08:00:00.000Z',
    updatedAt: '2026-04-16T08:00:00.000Z',
    ...overrides,
  }
}

function buildGroup(overrides: Partial<TaskGroup> = {}): TaskGroup {
  return {
    id: 'group-1',
    name: '版本交付',
    description: '',
    createdAt: '2026-04-16T08:00:00.000Z',
    updatedAt: '2026-04-16T08:00:00.000Z',
    ...overrides,
  }
}

describe('TaskDetailDialog', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await act(async () => {
      root.unmount()
    })
    container.remove()
    vi.restoreAllMocks()
  })

  it('saves an edited note through onSave', async () => {
    const onSave = vi.fn<(input: UpdateTaskInput) => void>()
    const task = buildTask({ note: '旧备注', priority: 'high' })

    await act(async () => {
      root.render(
        <TaskDetailDialog
          isOpen
          task={task}
          tasks={[task]}
          taskGroups={[buildGroup()]}
          isMutating={false}
          onClose={vi.fn()}
          onSave={onSave}
          onArchive={vi.fn()}
        />,
      )
    })

    const noteField = container.querySelector<HTMLTextAreaElement>('#task-detail-note')
    expect(noteField).not.toBeNull()

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
      valueSetter?.call(noteField, '补充处理背景')
      noteField!.dispatchEvent(new Event('input', { bubbles: true }))
    })

    const form = container.querySelector('form')
    await act(async () => {
      form!.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    })

    expect(onSave).toHaveBeenCalledWith({
      id: task.id,
      title: task.title,
      description: task.description,
      note: '补充处理背景',
      groupId: task.groupId,
      dueAt: task.dueAt,
      priority: task.priority,
    })
  })

  it('resets the editable draft when switching tasks while open', async () => {
    const onSave = vi.fn<(input: UpdateTaskInput) => void>()
    const firstTask = buildTask({
      id: 'task-1',
      title: 'First task',
      note: 'First note',
      priority: 'high',
    })
    const secondTask = buildTask({
      id: 'task-2',
      title: 'Second task',
      description: 'Second description',
      note: 'Second note',
      groupId: 'group-2',
      dueAt: '2026-04-30T10:00:00.000Z',
      priority: 'low',
    })
    const groups = [buildGroup(), buildGroup({ id: 'group-2', name: 'Personal' })]

    await act(async () => {
      root.render(
        <TaskDetailDialog
          isOpen
          task={firstTask}
          tasks={[firstTask, secondTask]}
          taskGroups={groups}
          isMutating={false}
          onClose={vi.fn()}
          onSave={onSave}
          onArchive={vi.fn()}
        />,
      )
    })

    const titleField = container.querySelector<HTMLInputElement>('#task-detail-title')
    expect(titleField).not.toBeNull()

    await act(async () => {
      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
      valueSetter?.call(titleField, 'Unsaved draft title')
      titleField!.dispatchEvent(new Event('input', { bubbles: true }))
    })

    await act(async () => {
      root.render(
        <TaskDetailDialog
          isOpen
          task={secondTask}
          tasks={[firstTask, secondTask]}
          taskGroups={groups}
          isMutating={false}
          onClose={vi.fn()}
          onSave={onSave}
          onArchive={vi.fn()}
        />,
      )
    })

    expect(container.querySelector<HTMLInputElement>('#task-detail-title')?.value).toBe(secondTask.title)
    expect(container.querySelector<HTMLTextAreaElement>('#task-detail-note')?.value).toBe(secondTask.note)
    expect(container.querySelector<HTMLSelectElement>('#task-detail-priority')?.value).toBe(secondTask.priority)
    expect(container.querySelector<HTMLSelectElement>('#task-detail-group')?.value).toBe(secondTask.groupId)
    expect(container.querySelector<HTMLInputElement>('#task-detail-due-at')?.value).toBe('2026-04-30')

    const form = container.querySelector('form')
    await act(async () => {
      form!.dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }))
    })

    expect(onSave).toHaveBeenCalledWith({
      id: secondTask.id,
      title: secondTask.title,
      description: secondTask.description,
      note: secondTask.note,
      groupId: secondTask.groupId,
      dueAt: '2026-04-30',
      priority: secondTask.priority,
    })
  })

  it('shows archive action for completed non-archived task and calls onArchive', async () => {
    const onArchive = vi.fn()
    const task = buildTask({
      completed: true,
      completedAt: '2026-04-17T09:30:00.000Z',
      archivedAt: null,
    })

    await act(async () => {
      root.render(
        <TaskDetailDialog
          isOpen
          task={task}
          tasks={[task]}
          taskGroups={[]}
          isMutating={false}
          onClose={vi.fn()}
          onSave={vi.fn()}
          onArchive={onArchive}
        />,
      )
    })

    const archiveButton = Array.from(container.querySelectorAll('button')).find((button) => button.textContent === '归档任务')
    expect(archiveButton).toBeDefined()

    await act(async () => {
      archiveButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onArchive).toHaveBeenCalledWith(task.id)
  })
})
