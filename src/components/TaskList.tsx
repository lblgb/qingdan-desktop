/**
 * 文件说明：任务列表组件，负责展示筛选结果并提供编辑、完成、删除和分页操作。
 */
import { useEffect, useMemo, useState } from 'react'
import { buildTaskGroups } from '../features/tasks/task.grouping'
import type { TaskItem } from '../features/tasks/task.types'
import { formatTaskDate } from '../lib/date'
import { useTaskStore } from '../stores/taskStore'

const EMPTY_STATE_COPY = {
  all: {
    title: '还没有可展示的任务',
    description: '先在上方新建一项任务，当前工作台会立刻开始积累。',
  },
  active: {
    title: '当前没有进行中的任务',
    description: '可以切回“全部任务”查看历史，或直接新建下一项待办。',
  },
  completed: {
    title: '还没有已完成的任务',
    description: '完成一项任务后，这里会保留你的收尾记录。',
  },
} as const

const PAGE_SIZE = 10

export function TaskList() {
  const filteredTasks = useTaskStore((state) => state.filteredTasks)
  const activeFilter = useTaskStore((state) => state.activeFilter)
  const activeGroupFilter = useTaskStore((state) => state.activeGroupFilter)
  const availableTaskGroups = useTaskStore((state) => state.taskGroups)
  const updateTask = useTaskStore((state) => state.updateTask)
  const toggleTask = useTaskStore((state) => state.toggleTask)
  const removeTask = useTaskStore((state) => state.removeTask)
  const isMutating = useTaskStore((state) => state.isMutating)
  const activeAction = useTaskStore((state) => state.activeAction)
  const isGrouping = useTaskStore((state) => state.activeAction === 'group')
  const emptyState = EMPTY_STATE_COPY[activeFilter]

  const [currentPage, setCurrentPage] = useState(1)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [editingDueAt, setEditingDueAt] = useState('')
  const [editingGroupId, setEditingGroupId] = useState('')

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE))
  const pagedTasks = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages)
    const startIndex = (safePage - 1) * PAGE_SIZE
    return filteredTasks.slice(startIndex, startIndex + PAGE_SIZE)
  }, [currentPage, filteredTasks, totalPages])
  const taskSections = buildTaskGroups(pagedTasks, activeFilter)

  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter, activeGroupFilter])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  function handleStartEdit(task: TaskItem) {
    setEditingTaskId(task.id)
    setEditingTitle(task.title)
    setEditingDescription(task.description)
    setEditingDueAt(task.dueAt ?? '')
    setEditingGroupId(task.groupId ?? '')
  }

  function handleCancelEdit() {
    setEditingTaskId(null)
    setEditingTitle('')
    setEditingDescription('')
    setEditingDueAt('')
    setEditingGroupId('')
  }

  async function handleSubmitEdit(taskId: string) {
    const nextTitle = editingTitle.trim()
    if (!nextTitle) {
      return
    }

    const currentTask = filteredTasks.find((task) => task.id === taskId)

    await updateTask({
      id: taskId,
      title: nextTitle,
      description: editingDescription.trim(),
      groupId: editingGroupId || null,
      dueAt: editingDueAt || null,
      priority: currentTask?.priority ?? 'medium',
    })

    handleCancelEdit()
  }

  if (filteredTasks.length === 0) {
    return (
      <section className="task-list-card empty-state">
        <p className="section-tag">当前列表</p>
        <h2>{emptyState.title}</h2>
        <p>{emptyState.description}</p>
      </section>
    )
  }

  return (
    <section className="task-list-card">
      <div className="section-heading">
        <div>
          <p className="section-tag">当前列表</p>
          <h2>任务清单</h2>
        </div>
        <p className="section-note">
          共 {filteredTasks.length} 项，当前第 {currentPage} / {totalPages} 页，每页 {PAGE_SIZE} 项
          {activeGroupFilter !== 'all-groups' ? '，并叠加了附加条件筛选。' : '。'}
        </p>
      </div>

      {isMutating && activeAction !== 'create' ? (
        <p className="list-feedback">
          {activeAction === 'update' && '正在保存任务修改...'}
          {activeAction === 'toggle' && '正在更新任务状态...'}
          {activeAction === 'remove' && '正在删除任务...'}
          {activeAction === 'group' && '正在调整任务组归属...'}
        </p>
      ) : null}

      <div className="task-group-list">
        {taskSections.map((group) => (
          <section key={group.key} className="task-group">
            <header className="task-group-header">
              <div>
                <h3>{group.title}</h3>
                <p>{group.description}</p>
              </div>
              <span className="task-group-count">{group.tasks.length}</span>
            </header>

            <ul className="task-list">
              {group.tasks.map((task) => {
                const isEditing = editingTaskId === task.id

                return (
                  <li key={task.id} className={task.completed ? 'task-item completed' : 'task-item'}>
                    {isEditing ? (
                      <>
                        <form
                          className="task-body task-edit-form"
                          onSubmit={(event) => {
                            event.preventDefault()
                            void handleSubmitEdit(task.id)
                          }}
                        >
                          <div className="task-main-row">
                            <span className="task-status editing">编辑中</span>
                          </div>

                          <label className="task-edit-field" htmlFor={`edit-title-${task.id}`}>
                            <span>标题</span>
                            <input
                              id={`edit-title-${task.id}`}
                              value={editingTitle}
                              onChange={(event) => setEditingTitle(event.target.value)}
                              placeholder="例如：整理第二版验收问题"
                            />
                          </label>

                          <label className="task-edit-field" htmlFor={`edit-description-${task.id}`}>
                            <span>备注</span>
                            <textarea
                              id={`edit-description-${task.id}`}
                              value={editingDescription}
                              onChange={(event) => setEditingDescription(event.target.value)}
                              placeholder="补充背景、目标或拆解点"
                              rows={3}
                            />
                          </label>

                          <label className="task-edit-field" htmlFor={`edit-dueAt-${task.id}`}>
                            <span>截止日期</span>
                            <input
                              id={`edit-dueAt-${task.id}`}
                              type="date"
                              value={editingDueAt}
                              onChange={(event) => setEditingDueAt(event.target.value)}
                            />
                          </label>

                          <label className="task-edit-field" htmlFor={`edit-group-${task.id}`}>
                            <span>所属任务组</span>
                            <select
                              id={`edit-group-${task.id}`}
                              value={editingGroupId}
                              onChange={(event) => setEditingGroupId(event.target.value)}
                              disabled={isMutating}
                            >
                              <option value="">未分组</option>
                              {availableTaskGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.name}
                                </option>
                              ))}
                            </select>
                          </label>

                          <div className="task-meta">
                            <span>{formatTaskDate(task.createdAt, '创建于 YYYY-MM-DD')}</span>
                            <span>{formatTaskDate(task.updatedAt, '最近更新于 YYYY-MM-DD')}</span>
                          </div>
                        </form>

                        <div className="task-actions">
                          <button className="secondary-button" onClick={handleCancelEdit} type="button" disabled={isMutating}>
                            取消
                          </button>
                          <button
                            className="primary-button task-save-button"
                            onClick={() => void handleSubmitEdit(task.id)}
                            type="button"
                            disabled={isMutating}
                          >
                            保存
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="task-body">
                          <div className="task-main-row">
                            <button
                              className={task.completed ? 'check-button checked' : 'check-button'}
                              onClick={() => void toggleTask(task.id)}
                              type="button"
                              disabled={isMutating}
                            >
                              <span className="check-indicator" aria-hidden="true" />
                              {task.completed ? '已完成' : '标记完成'}
                            </button>
                            <span className={task.completed ? 'task-status done' : 'task-status'}>
                              {task.completed ? '已完成' : '进行中'}
                            </span>
                          </div>

                          <div className="task-main">
                            <h3>{task.title}</h3>
                            {task.description ? <p>{task.description}</p> : null}
                          </div>

                          <div className="task-meta">
                            <span>
                              {task.groupId
                                ? `任务组：${availableTaskGroups.find((group) => group.id === task.groupId)?.name ?? '未知分组'}`
                                : '未分组'}
                            </span>
                            <span>{formatTaskDate(task.dueAt)}</span>
                            <span>{formatTaskDate(task.createdAt, '创建于 YYYY-MM-DD')}</span>
                          </div>
                        </div>

                        <div className="task-actions">
                          <button
                            className="secondary-button"
                            onClick={() => handleStartEdit(task)}
                            type="button"
                            disabled={isMutating || isGrouping}
                          >
                            编辑
                          </button>
                          <button className="ghost-button" onClick={() => void removeTask(task.id)} type="button" disabled={isMutating}>
                            删除
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      {filteredTasks.length > PAGE_SIZE ? (
        <div className="pagination-bar">
          <p className="section-note">
            当前展示 {(currentPage - 1) * PAGE_SIZE + 1}-{Math.min(currentPage * PAGE_SIZE, filteredTasks.length)} / {filteredTasks.length}
          </p>
          <div className="pagination-actions">
            <button className="secondary-button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} type="button" disabled={currentPage === 1}>
              上一页
            </button>

            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                <button
                  key={page}
                  className={page === currentPage ? 'pagination-page-button active' : 'pagination-page-button'}
                  onClick={() => setCurrentPage(page)}
                  type="button"
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              className="secondary-button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              type="button"
              disabled={currentPage === totalPages}
            >
              下一页
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
