import { useState } from 'react'
import { formatTaskDate } from '../lib/date'
import { getTaskQualityWarnings } from '../features/tasks/task.quality'
import { TASK_PRIORITY_META } from '../features/tasks/task.priority'
import type { TaskGroup, TaskItem, TaskPriority, UpdateTaskInput } from '../features/tasks/task.types'

const PRIORITY_OPTIONS: TaskPriority[] = ['urgent', 'high', 'medium', 'low']

export interface TaskDetailDialogProps {
  isOpen: boolean
  task: TaskItem | null
  tasks: TaskItem[]
  taskGroups: TaskGroup[]
  isMutating: boolean
  onClose: () => void
  onSave: (input: UpdateTaskInput) => void | Promise<void>
  onArchive: (taskId: string) => void | Promise<void>
}

function toDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : ''
}

export function TaskDetailDialog({
  isOpen,
  task,
  tasks,
  taskGroups,
  isMutating,
  onClose,
  onSave,
  onArchive,
}: TaskDetailDialogProps) {
  if (!isOpen || !task) {
    return null
  }

  return (
    <TaskDetailDialogContent
      key={task.id}
      task={task}
      tasks={tasks}
      taskGroups={taskGroups}
      isMutating={isMutating}
      onClose={onClose}
      onSave={onSave}
      onArchive={onArchive}
    />
  )
}

function TaskDetailDialogContent({
  task,
  tasks,
  taskGroups,
  isMutating,
  onClose,
  onSave,
  onArchive,
}: Omit<TaskDetailDialogProps, 'isOpen' | 'task'> & { task: TaskItem }) {
  const [title, setTitle] = useState(task.title)
  const [note, setNote] = useState(task.note)
  const [priority, setPriority] = useState<TaskPriority>(task.priority)
  const [groupId, setGroupId] = useState(task.groupId ?? '')
  const [dueAt, setDueAt] = useState(toDateInputValue(task.dueAt))

  const normalizedTitle = title.trim()
  const qualityTask: TaskItem = {
    ...task,
    title,
    note,
    priority,
    groupId: groupId || null,
    dueAt: dueAt || null,
  }
  const warnings = getTaskQualityWarnings(qualityTask, tasks)
  const canArchive = task.completed && !task.archivedAt

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!normalizedTitle) {
      return
    }

    await onSave({
      id: task.id,
      title: normalizedTitle,
      description: task.description,
      note: note.trim(),
      groupId: groupId || null,
      dueAt: dueAt || null,
      priority,
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <section
        aria-labelledby="task-detail-dialog-title"
        aria-modal="true"
        className="task-modal"
        role="dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="task-modal-header task-modal-console-header">
          <div>
            <p className="section-tag">任务详情</p>
            <h2 id="task-detail-dialog-title">编辑任务</h2>
          </div>
          <button className="secondary-button modal-close-button" disabled={isMutating} onClick={onClose} type="button">
            关闭
          </button>
        </div>

        <form className="composer-form task-modal-form" onSubmit={(event) => void handleSubmit(event)}>
          <label htmlFor="task-detail-title">
            <span>标题</span>
            <input
              id="task-detail-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              disabled={isMutating}
            />
          </label>

          <label htmlFor="task-detail-note">
            <span>备注</span>
            <textarea
              id="task-detail-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="补充任务背景、处理线索或下一步动作"
              rows={5}
              disabled={isMutating}
            />
          </label>

          {task.description ? <p className="task-note-summary">原补充说明：{task.description}</p> : null}

          <div className="task-detail-grid">
            <label htmlFor="task-detail-priority">
              <span>优先级</span>
              <select
                id="task-detail-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as TaskPriority)}
                disabled={isMutating}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {TASK_PRIORITY_META[option].label}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="task-detail-group">
              <span>任务组</span>
              <select
                id="task-detail-group"
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                disabled={isMutating}
              >
                <option value="">未分组</option>
                {taskGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </label>

            <label htmlFor="task-detail-due-at">
              <span>截止日期</span>
              <input
                id="task-detail-due-at"
                type="date"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                disabled={isMutating}
              />
            </label>
          </div>

          <dl className="task-detail-meta">
            <div className="task-detail-meta-panel">
              <dt>创建时间</dt>
              <dd className="task-detail-meta-value">{formatTaskDate(task.createdAt, 'YYYY-MM-DD HH:mm')}</dd>
            </div>
            <div className="task-detail-meta-panel">
              <dt>更新时间</dt>
              <dd className="task-detail-meta-value">{formatTaskDate(task.updatedAt, 'YYYY-MM-DD HH:mm')}</dd>
            </div>
            <div className="task-detail-meta-panel">
              <dt>完成时间</dt>
              <dd className="task-detail-meta-value">{formatTaskDate(task.completedAt, 'YYYY-MM-DD HH:mm')}</dd>
            </div>
            <div className="task-detail-meta-panel">
              <dt>归档时间</dt>
              <dd className="task-detail-meta-value">{formatTaskDate(task.archivedAt, 'YYYY-MM-DD HH:mm')}</dd>
            </div>
          </dl>

          {warnings.length > 0 ? (
            <div className="task-quality-warning" role="note" aria-label="任务质量提醒">
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          ) : null}

          <div className="composer-actions task-modal-actions task-modal-console-actions">
            <div className="composer-feedback">
              {isMutating ? <span className="inline-feedback">正在保存任务变更...</span> : null}
            </div>
            <div className="task-modal-button-row task-modal-console-button-row">
              {canArchive ? (
                <button
                  className="secondary-button"
                  disabled={isMutating}
                  onClick={() => void onArchive(task.id)}
                  type="button"
                >
                  归档任务
                </button>
              ) : null}
              <button className="secondary-button" disabled={isMutating} onClick={onClose} type="button">
                取消
              </button>
              <button className="primary-button" disabled={isMutating || !normalizedTitle} type="submit">
                保存任务
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  )
}
