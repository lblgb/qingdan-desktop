/**
 * 文件说明：任务列表组件，负责展示筛选结果并提供编辑、完成、删除、分页和批量操作。
 */
import { useEffect, useMemo, useState } from 'react'
import { buildBulkCompleteInput, buildBulkGroupInput, buildBulkPriorityInput, BULK_PRIORITY_OPTIONS } from '../features/tasks/task.bulk'
import { applyTaskQuery, summarizeFilters } from '../features/tasks/task.filters'
import { buildTaskGroups } from '../features/tasks/task.grouping'
import { TASK_PRIORITY_META } from '../features/tasks/task.priority'
import type { TaskItem, TaskPriority } from '../features/tasks/task.types'
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
const BULK_UNGROUPED_VALUE = '__ungrouped__'
const PRIORITY_SEQUENCE: TaskPriority[] = ['urgent', 'high', 'medium', 'low']

function nextPriority(priority: TaskPriority) {
  const currentIndex = PRIORITY_SEQUENCE.indexOf(priority)
  return PRIORITY_SEQUENCE[(currentIndex + 1) % PRIORITY_SEQUENCE.length]
}

export function TaskList() {
  const tasks = useTaskStore((state) => state.tasks)
  const filteredTasks = useTaskStore((state) => state.filteredTasks)
  const activeFilter = useTaskStore((state) => state.activeFilter)
  const activeGroupFilter = useTaskStore((state) => state.activeGroupFilter)
  const activePriorityFilter = useTaskStore((state) => state.activePriorityFilter)
  const activeDateRange = useTaskStore((state) => state.activeDateRange)
  const activeSortBy = useTaskStore((state) => state.activeSortBy)
  const availableTaskGroups = useTaskStore((state) => state.taskGroups)
  const updateTask = useTaskStore((state) => state.updateTask)
  const toggleTask = useTaskStore((state) => state.toggleTask)
  const removeTask = useTaskStore((state) => state.removeTask)
  const isMutating = useTaskStore((state) => state.isMutating)
  const activeAction = useTaskStore((state) => state.activeAction)
  const isGrouping = useTaskStore((state) => state.activeAction === 'group')
  const isBulkMode = useTaskStore((state) => state.isBulkMode)
  const selectedTaskIds = useTaskStore((state) => state.selectedTaskIds)
  const toggleBulkMode = useTaskStore((state) => state.toggleBulkMode)
  const toggleTaskSelection = useTaskStore((state) => state.toggleTaskSelection)
  const clearTaskSelection = useTaskStore((state) => state.clearTaskSelection)
  const applyBulkUpdate = useTaskStore((state) => state.applyBulkUpdate)
  const emptyState = EMPTY_STATE_COPY[activeFilter]

  const [currentPage, setCurrentPage] = useState(1)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingDescription, setEditingDescription] = useState('')
  const [editingDueAt, setEditingDueAt] = useState('')
  const [editingGroupId, setEditingGroupId] = useState('')
  const [editingPriority, setEditingPriority] = useState<TaskPriority>('medium')
  const [bulkGroupValue, setBulkGroupValue] = useState('')

  const totalPages = Math.max(1, Math.ceil(filteredTasks.length / PAGE_SIZE))
  const pagedTasks = useMemo(() => {
    const safePage = Math.min(currentPage, totalPages)
    const startIndex = (safePage - 1) * PAGE_SIZE
    return filteredTasks.slice(startIndex, startIndex + PAGE_SIZE)
  }, [currentPage, filteredTasks, totalPages])
  const taskSections = buildTaskGroups(pagedTasks, activeFilter)

  const currentQuery = useMemo(
    () => ({
      status: activeFilter,
      group: activeGroupFilter,
      priority: activePriorityFilter,
      dateRange: activeDateRange,
      sortBy: activeSortBy,
    }),
    [activeDateRange, activeFilter, activeGroupFilter, activePriorityFilter, activeSortBy],
  )

  const filterSummary = useMemo(
    () => summarizeFilters(currentQuery, availableTaskGroups),
    [availableTaskGroups, currentQuery],
  )

  const selectedCount = selectedTaskIds.length
  const selectedVisibleCount = filteredTasks.filter((task) => selectedTaskIds.includes(task.id)).length
  const filteredActiveTasks = useMemo(
    () =>
      applyTaskQuery(tasks, {
        ...currentQuery,
        status: 'active',
      }),
    [currentQuery, tasks],
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [activeFilter, activeGroupFilter, activePriorityFilter, activeDateRange, activeSortBy])

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    if (!isBulkMode) {
      setBulkGroupValue('')
      return
    }

    handleCancelEdit()
  }, [isBulkMode])

  function handleStartEdit(task: TaskItem) {
    setEditingTaskId(task.id)
    setEditingTitle(task.title)
    setEditingDescription(task.description)
    setEditingDueAt(task.dueAt ?? '')
    setEditingGroupId(task.groupId ?? '')
    setEditingPriority(task.priority)
  }

  function handleCancelEdit() {
    setEditingTaskId(null)
    setEditingTitle('')
    setEditingDescription('')
    setEditingDueAt('')
    setEditingGroupId('')
    setEditingPriority('medium')
  }

  async function handleSubmitEdit(taskId: string) {
    const nextTitle = editingTitle.trim()
    if (!nextTitle) {
      return
    }

    await updateTask({
      id: taskId,
      title: nextTitle,
      description: editingDescription.trim(),
      groupId: editingGroupId || null,
      dueAt: editingDueAt || null,
      priority: editingPriority,
    })

    handleCancelEdit()
  }

  async function handleCyclePriority(task: TaskItem) {
    await updateTask({
      id: task.id,
      title: task.title,
      description: task.description,
      groupId: task.groupId,
      dueAt: task.dueAt,
      priority: nextPriority(task.priority),
    })
  }

  async function handleApplyBulkPriority(priority: TaskPriority) {
    if (selectedCount === 0) {
      return
    }

    await applyBulkUpdate(buildBulkPriorityInput(selectedTaskIds, priority))
  }

  async function handleApplyBulkGroup() {
    if (selectedCount === 0 || !bulkGroupValue) {
      return
    }

    const groupId = bulkGroupValue === BULK_UNGROUPED_VALUE ? null : bulkGroupValue
    await applyBulkUpdate(buildBulkGroupInput(selectedTaskIds, groupId))
    setBulkGroupValue('')
  }

  async function handleCompleteSelectedTasks() {
    if (selectedCount === 0) {
      return
    }

    await applyBulkUpdate(buildBulkCompleteInput(selectedTaskIds))
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
          共 {filteredTasks.length} 项，当前第 {currentPage} / {totalPages} 页，每页 {PAGE_SIZE} 项。
        </p>
      </div>

      <div className="task-list-toolbar">
        <div className="task-list-toolbar-main">
          <span className="filter-summary-pill">{filterSummary}</span>
          <p className="section-note">
            当前结果中进行中 {filteredActiveTasks.length} 项，本页显示 {pagedTasks.length} 项。
          </p>
        </div>

        <div className="task-list-toolbar-actions">
          {isBulkMode ? (
            <button className="secondary-button" onClick={toggleBulkMode} type="button" disabled={isMutating}>
              退出批量
            </button>
          ) : (
            <button className="secondary-button" onClick={toggleBulkMode} type="button" disabled={isMutating}>
              批量操作
            </button>
          )}
        </div>
      </div>

      {isBulkMode ? (
        <div className="bulk-toolbar">
          <div className="bulk-toolbar-main">
            <strong>已选 {selectedCount} 项</strong>
            <p className="section-note">
              当前筛选结果内可见 {selectedVisibleCount} 项。批量操作只包含改优先级、归组和完成。
            </p>
          </div>

          <div className="bulk-toolbar-actions">
            <div className="bulk-priority-actions">
              {BULK_PRIORITY_OPTIONS.map((priority) => (
                <button
                  key={priority}
                  className="secondary-button"
                  onClick={() => void handleApplyBulkPriority(priority)}
                  type="button"
                  disabled={isMutating || selectedCount === 0}
                >
                  设为{TASK_PRIORITY_META[priority].label}
                </button>
              ))}
            </div>

            <div className="bulk-group-actions">
              <select
                className="bulk-group-select"
                value={bulkGroupValue}
                onChange={(event) => setBulkGroupValue(event.target.value)}
                disabled={isMutating}
              >
                <option value="">选择任务组</option>
                <option value={BULK_UNGROUPED_VALUE}>未分组</option>
                {availableTaskGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>

              <button
                className="secondary-button"
                onClick={() => void handleApplyBulkGroup()}
                type="button"
                disabled={isMutating || selectedCount === 0 || !bulkGroupValue}
              >
                应用归组
              </button>
            </div>

            <button
              className="primary-button"
              onClick={() => void handleCompleteSelectedTasks()}
              type="button"
              disabled={isMutating || selectedCount === 0}
            >
              标记完成
            </button>

            {selectedCount > 0 ? (
              <button className="ghost-button" onClick={clearTaskSelection} type="button" disabled={isMutating}>
                清空选择
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {isMutating && activeAction !== 'create' ? (
        <p className="list-feedback">
          {activeAction === 'update' && '正在保存任务修改...'}
          {activeAction === 'toggle' && '正在更新任务状态...'}
          {activeAction === 'remove' && '正在删除任务...'}
          {activeAction === 'group' && '正在调整任务组归属...'}
          {activeAction === 'bulk' && '正在批量更新任务...'}
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
                const isSelected = selectedTaskIds.includes(task.id)

                return (
                  <li
                    key={task.id}
                    className={[
                      'task-item',
                      task.completed ? 'completed' : '',
                      isSelected ? 'selected' : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
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
                            <span className={`priority-badge ${editingPriority}`}>{TASK_PRIORITY_META[editingPriority].label}</span>
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

                          <div className="task-modal-grid">
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
                                {availableTaskGroups.map((groupItem) => (
                                  <option key={groupItem.id} value={groupItem.id}>
                                    {groupItem.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="task-edit-field" htmlFor={`edit-priority-${task.id}`}>
                              <span>优先级</span>
                              <select
                                id={`edit-priority-${task.id}`}
                                value={editingPriority}
                                onChange={(event) => setEditingPriority(event.target.value as TaskPriority)}
                                disabled={isMutating}
                              >
                                {BULK_PRIORITY_OPTIONS.map((priority) => (
                                  <option key={priority} value={priority}>
                                    {TASK_PRIORITY_META[priority].label}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>

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
                            {isBulkMode ? (
                              <label className="selection-toggle">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleTaskSelection(task.id)}
                                  disabled={isMutating}
                                />
                                <span>{isSelected ? '已选中' : '选择任务'}</span>
                              </label>
                            ) : (
                              <button
                                className={task.completed ? 'check-button checked' : 'check-button'}
                                onClick={() => void toggleTask(task.id)}
                                type="button"
                                disabled={isMutating}
                              >
                                <span className="check-indicator" aria-hidden="true" />
                                {task.completed ? '已完成' : '标记完成'}
                              </button>
                            )}

                            <div className="task-tag-row">
                              <button
                                className={`priority-badge priority-badge-button ${task.priority}`}
                                onClick={() => void handleCyclePriority(task)}
                                type="button"
                                disabled={isMutating}
                              >
                                {TASK_PRIORITY_META[task.priority].label}
                              </button>
                              <span className={task.completed ? 'task-status done' : 'task-status'}>
                                {task.completed ? '已完成' : '进行中'}
                              </span>
                            </div>
                          </div>

                          <div className="task-main">
                            <h3>{task.title}</h3>
                            {task.description ? <p>{task.description}</p> : null}
                          </div>

                          <div className="task-meta">
                            <span>
                              {task.groupId
                                ? `任务组：${availableTaskGroups.find((groupItem) => groupItem.id === task.groupId)?.name ?? '未知分组'}`
                                : '未分组'}
                            </span>
                            <span>{formatTaskDate(task.dueAt)}</span>
                            <span>{formatTaskDate(task.createdAt, '创建于 YYYY-MM-DD')}</span>
                          </div>
                        </div>

                        {!isBulkMode ? (
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
                        ) : null}
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
