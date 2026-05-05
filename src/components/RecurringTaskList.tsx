import { useEffect, useState } from 'react'
import type {
  RecurringCadenceUnit,
  RecurringPeriod,
  RecurringProgressEntry,
  RecurringTask,
} from '../features/recurring/recurring.types'
import { formatTaskDate } from '../lib/date'
import { useRecurringStore } from '../stores/recurringStore'

const CADENCE_LABELS: Record<RecurringCadenceUnit, string> = {
  minute: '分钟',
  hour: '小时',
  day: '天',
  week: '周',
}

const CADENCE_OPTIONS: RecurringCadenceUnit[] = ['minute', 'hour', 'day', 'week']

function getCurrentPeriod(periods: RecurringPeriod[]) {
  return [...periods].sort((left, right) => right.startAt.localeCompare(left.startAt))[0] ?? null
}

function flattenEntries(periods: RecurringPeriod[], entriesByPeriodId: Record<string, RecurringProgressEntry[]>) {
  return periods
    .flatMap((period) =>
      (entriesByPeriodId[period.id] ?? []).map((entry) => ({
        period,
        entry,
      })),
    )
    .sort((left, right) => right.entry.updatedAt.localeCompare(left.entry.updatedAt))
}

export function RecurringTaskList() {
  const tasks = useRecurringStore((state) => state.tasks)
  const periodsByTaskId = useRecurringStore((state) => state.periodsByTaskId)
  const entriesByPeriodId = useRecurringStore((state) => state.entriesByPeriodId)
  const isMutating = useRecurringStore((state) => state.isMutating)
  const selectTask = useRecurringStore((state) => state.selectTask)
  const selectPeriod = useRecurringStore((state) => state.selectPeriod)
  const addEntry = useRecurringStore((state) => state.addEntry)
  const saveEntry = useRecurringStore((state) => state.saveEntry)
  const saveTask = useRecurringStore((state) => state.saveTask)
  const removeTask = useRecurringStore((state) => state.removeTask)

  const [activeProgressTask, setActiveProgressTask] = useState<RecurringTask | null>(null)
  const [activePeriod, setActivePeriod] = useState<RecurringPeriod | null>(null)
  const [editingEntry, setEditingEntry] = useState<RecurringProgressEntry | null>(null)
  const [entryContent, setEntryContent] = useState('')
  const [detailTask, setDetailTask] = useState<RecurringTask | null>(null)
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCadenceUnit, setEditCadenceUnit] = useState<RecurringCadenceUnit>('week')
  const [editCadenceInterval, setEditCadenceInterval] = useState('1')
  const [editRemindAtEnd, setEditRemindAtEnd] = useState(true)
  const [editIsActive, setEditIsActive] = useState(true)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeProgressModal()
        closeDetailModal()
        closeEditModal()
      }
    }

    if (activePeriod || detailTask || editingTask) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePeriod, detailTask, editingTask])

  async function ensureTaskHistoryLoaded(task: RecurringTask) {
    await selectTask(task.id)
    const periods = periodsByTaskId[task.id] ?? []
    await Promise.all(periods.map((period) => selectPeriod(period.id)))
  }

  function openProgressModal(task: RecurringTask, period: RecurringPeriod, entry?: RecurringProgressEntry) {
    void selectTask(task.id)
    void selectPeriod(period.id)
    setActiveProgressTask(task)
    setActivePeriod(period)
    setEditingEntry(entry ?? null)
    setEntryContent(entry?.content ?? '')
  }

  function closeProgressModal() {
    setActiveProgressTask(null)
    setActivePeriod(null)
    setEditingEntry(null)
    setEntryContent('')
  }

  async function openDetailModal(task: RecurringTask) {
    await ensureTaskHistoryLoaded(task)
    setDetailTask(task)
  }

  function closeDetailModal() {
    setDetailTask(null)
  }

  function openEditModal(task: RecurringTask) {
    setEditingTask(task)
    setEditTitle(task.title)
    setEditDescription(task.description)
    setEditCadenceUnit(task.cadenceUnit)
    setEditCadenceInterval(String(task.cadenceInterval))
    setEditRemindAtEnd(task.remindAtEnd)
    setEditIsActive(task.isActive)
  }

  function closeEditModal() {
    setEditingTask(null)
    setEditTitle('')
    setEditDescription('')
    setEditCadenceUnit('week')
    setEditCadenceInterval('1')
    setEditRemindAtEnd(true)
    setEditIsActive(true)
  }

  async function handleSubmitProgress(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = entryContent.trim()
    if (!activePeriod || !content) {
      return
    }

    if (editingEntry) {
      await saveEntry({ id: editingEntry.id, content })
    } else {
      await addEntry({ periodId: activePeriod.id, content })
    }

    closeProgressModal()
  }

  async function handleSubmitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingTask || !editTitle.trim()) {
      return
    }

    await saveTask({
      id: editingTask.id,
      title: editTitle.trim(),
      description: editDescription.trim(),
      cadenceUnit: editCadenceUnit,
      cadenceInterval: Math.max(1, Number(editCadenceInterval) || 1),
      remindAtEnd: editRemindAtEnd,
      isActive: editIsActive,
    })

    closeEditModal()
  }

  async function handleRemoveTask(taskId: string) {
    await removeTask(taskId)
    if (detailTask?.id === taskId) {
      closeDetailModal()
    }
    if (editingTask?.id === taskId) {
      closeEditModal()
    }
  }

  if (tasks.length === 0) {
    return (
      <section className="task-list-card empty-state">
        <p className="section-tag">周期任务</p>
        <h2>还没有周期任务</h2>
        <p>从顶部“新建”菜单里创建周期任务后，这里会显示每个周期的提交状态。</p>
      </section>
    )
  }

  return (
    <>
      <section className="task-list-card">
        <div className="section-heading">
          <div>
            <p className="section-tag">周期任务</p>
            <h2>周期任务清单</h2>
          </div>
          <p className="section-note">共 {tasks.length} 项，列表只展示当前周期状态和最近一条进展。</p>
        </div>

        <div className="task-group-list">
          <section className="task-group">
            <ul className="task-list">
              {tasks.map((task) => {
                const periods = periodsByTaskId[task.id] ?? []
                const currentPeriod = getCurrentPeriod(periods)
                const entries = currentPeriod ? entriesByPeriodId[currentPeriod.id] ?? [] : []
                const latestEntry = [...entries].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0] ?? null
                const isSubmitted = entries.length > 0

                return (
                  <li key={task.id} className={isSubmitted ? 'task-item completed' : 'task-item'} data-recurring-task-id={task.id}>
                    <div className="task-module-card">
                      <div className="task-body">
                        <div className="task-main-row task-module-header">
                          <span className={isSubmitted ? 'task-console-chip task-state-chip is-done' : 'task-console-chip task-state-chip is-active'}>
                            {isSubmitted ? '本周期已提交' : '本周期未提交'}
                          </span>
                          <div className="task-tag-row">
                            <span className="task-console-chip is-meta">
                              每 {task.cadenceInterval} {CADENCE_LABELS[task.cadenceUnit]}
                            </span>
                            <span className="task-console-chip is-meta">{task.isActive ? '启用' : '停用'}</span>
                          </div>
                        </div>

                        <div className="task-main">
                          <h3>{task.title}</h3>
                          {task.description ? <p>{task.description}</p> : null}
                        </div>

                        <div className="task-meta">
                          {currentPeriod ? (
                            <>
                              <span className="task-console-chip is-meta">{formatTaskDate(currentPeriod.startAt, '开始 YYYY-MM-DD HH:mm')}</span>
                              <span className="task-console-chip is-meta">{formatTaskDate(currentPeriod.endAt, '结束 YYYY-MM-DD HH:mm')}</span>
                              <span className="task-console-chip is-meta">{entries.length} 条进展</span>
                            </>
                          ) : (
                            <span className="task-console-chip is-meta">等待生成周期</span>
                          )}
                        </div>

                        {latestEntry ? (
                          <div className="recurring-latest-entry">
                            <span>最近进展 · {formatTaskDate(latestEntry.updatedAt, 'YYYY-MM-DD HH:mm')}</span>
                            <p>{latestEntry.content}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="task-actions task-actions-console">
                        {currentPeriod ? (
                          <button className="primary-button" disabled={isMutating} onClick={() => openProgressModal(task, currentPeriod)} type="button">
                            提交进展
                          </button>
                        ) : (
                          <button className="secondary-button" disabled type="button">
                            等待周期
                          </button>
                        )}
                        <button className="secondary-button" onClick={() => void openDetailModal(task)} type="button" disabled={isMutating}>
                          详情
                        </button>
                        <button className="secondary-button" onClick={() => openEditModal(task)} type="button" disabled={isMutating}>
                          编辑
                        </button>
                        <button className="ghost-button" onClick={() => void handleRemoveTask(task.id)} type="button" disabled={isMutating}>
                          删除
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        </div>
      </section>

      {detailTask ? (
        <div className="modal-backdrop" onClick={closeDetailModal} role="presentation">
          <section
            className="task-modal recurring-detail-modal"
            aria-labelledby="recurring-detail-title"
            aria-modal="true"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="task-modal-header task-modal-console-header">
              <div>
                <p className="section-tag">周期任务详情</p>
                <h2 id="recurring-detail-title">{detailTask.title}</h2>
                <div className="recurring-detail-headline">
                  <p>{detailTask.description || '暂无说明。'}</p>
                  <div className="task-meta">
                    <span className="task-console-chip is-meta">
                      每 {detailTask.cadenceInterval} {CADENCE_LABELS[detailTask.cadenceUnit]}
                    </span>
                    <span className="task-console-chip is-meta">{detailTask.remindAtEnd ? '到期提醒' : '不提醒'}</span>
                    <span className="task-console-chip is-meta">{detailTask.isActive ? '启用' : '停用'}</span>
                  </div>
                </div>
              </div>
              <button className="secondary-button modal-close-button" disabled={isMutating} onClick={closeDetailModal} type="button">
                关闭
              </button>
            </div>

            <div className="task-detail-grid recurring-detail-grid">
              <section className="task-detail-section recurring-detail-summary is-hidden">
                <p>{detailTask.description || '暂无说明。'}</p>
                <div className="task-meta">
                  <span className="task-console-chip is-meta">
                    每 {detailTask.cadenceInterval} {CADENCE_LABELS[detailTask.cadenceUnit]}
                  </span>
                  <span className="task-console-chip is-meta">{detailTask.remindAtEnd ? '到期提醒' : '不提醒'}</span>
                  <span className="task-console-chip is-meta">{detailTask.isActive ? '启用' : '停用'}</span>
                </div>
              </section>

              <section className="task-detail-section">
                <div className="recurring-history-heading">
                  <div>
                    <h3>历史进展</h3>
                    <p className="section-note">按更新时间倒序展示，点击单条记录可修改。</p>
                  </div>
                  <span className="task-console-chip is-meta">
                    {flattenEntries(periodsByTaskId[detailTask.id] ?? [], entriesByPeriodId).length} 条
                  </span>
                </div>

                {flattenEntries(periodsByTaskId[detailTask.id] ?? [], entriesByPeriodId).length > 0 ? (
                  <ol className="recurring-history-timeline">
                    {flattenEntries(periodsByTaskId[detailTask.id] ?? [], entriesByPeriodId).map(({ period, entry }) => (
                      <li key={entry.id}>
                        <div className="recurring-history-marker" aria-hidden="true" />
                        <article className="recurring-history-card">
                          <div className="recurring-history-header">
                            <div>
                              <span className="task-console-chip is-meta">
                                {formatTaskDate(period.startAt, 'YYYY-MM-DD HH:mm')} - {formatTaskDate(period.endAt, 'YYYY-MM-DD HH:mm')}
                              </span>
                              <small>更新于 {formatTaskDate(entry.updatedAt, 'YYYY-MM-DD HH:mm')}</small>
                            </div>
                            <button className="secondary-button" onClick={() => openProgressModal(detailTask, period, entry)} type="button" disabled={isMutating}>
                              修改
                            </button>
                          </div>
                          <p>{entry.content}</p>
                        </article>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="section-note">还没有提交过进展。</p>
                )}
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {editingTask ? (
        <div className="modal-backdrop" onClick={closeEditModal} role="presentation">
          <section
            className="task-modal"
            aria-labelledby="recurring-edit-title"
            aria-modal="true"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="task-modal-header task-modal-console-header">
              <div>
                <p className="section-tag">周期任务</p>
                <h2 id="recurring-edit-title">编辑周期任务</h2>
              </div>
              <button className="secondary-button modal-close-button" disabled={isMutating} onClick={closeEditModal} type="button">
                关闭
              </button>
            </div>

            <form className="composer-form task-modal-form" onSubmit={(event) => void handleSubmitEdit(event)}>
              <label htmlFor="recurring-edit-task-title">
                <span>标题</span>
                <input id="recurring-edit-task-title" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} disabled={isMutating} />
              </label>

              <label htmlFor="recurring-edit-task-description">
                <span>说明</span>
                <textarea
                  id="recurring-edit-task-description"
                  value={editDescription}
                  onChange={(event) => setEditDescription(event.target.value)}
                  rows={4}
                  disabled={isMutating}
                />
              </label>

              <div className="task-modal-grid">
                <label htmlFor="recurring-edit-task-interval">
                  <span>周期步长</span>
                  <input
                    id="recurring-edit-task-interval"
                    type="number"
                    min={1}
                    value={editCadenceInterval}
                    onChange={(event) => setEditCadenceInterval(event.target.value)}
                    disabled={isMutating}
                  />
                </label>

                <label htmlFor="recurring-edit-task-unit">
                  <span>周期单位</span>
                  <select
                    id="recurring-edit-task-unit"
                    value={editCadenceUnit}
                    onChange={(event) => setEditCadenceUnit(event.target.value as RecurringCadenceUnit)}
                    disabled={isMutating}
                  >
                    {CADENCE_OPTIONS.map((unit) => (
                      <option key={unit} value={unit}>
                        {CADENCE_LABELS[unit]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="recurring-toggle-grid">
                <label className="task-settings-toggle" htmlFor="recurring-edit-reminder">
                  <input
                    id="recurring-edit-reminder"
                    type="checkbox"
                    checked={editRemindAtEnd}
                    onChange={(event) => setEditRemindAtEnd(event.target.checked)}
                    disabled={isMutating}
                  />
                  <span>周期结束时提醒填写进展</span>
                </label>

                <label className="task-settings-toggle" htmlFor="recurring-edit-active">
                  <input
                    id="recurring-edit-active"
                    type="checkbox"
                    checked={editIsActive}
                    onChange={(event) => setEditIsActive(event.target.checked)}
                    disabled={isMutating}
                  />
                  <span>启用这个周期任务</span>
                </label>
              </div>

              <div className="composer-actions task-modal-actions task-modal-console-actions">
                <div className="composer-feedback">
                  {isMutating ? <span className="inline-feedback">正在保存周期任务...</span> : null}
                </div>
                <div className="task-modal-button-row task-modal-console-button-row">
                  <button className="secondary-button" disabled={isMutating} onClick={closeEditModal} type="button">
                    取消
                  </button>
                  <button className="primary-button" disabled={isMutating || !editTitle.trim()} type="submit">
                    保存
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {activePeriod ? (
        <div className="modal-backdrop" onClick={closeProgressModal} role="presentation">
          <section
            className="task-modal"
            aria-labelledby="recurring-progress-title"
            aria-modal="true"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="task-modal-header task-modal-console-header">
              <div>
                <p className="section-tag">{activeProgressTask?.title ?? '周期进展'}</p>
                <h2 id="recurring-progress-title">{editingEntry ? '修改进展' : '提交进展'}</h2>
              </div>
              <button className="secondary-button modal-close-button" disabled={isMutating} onClick={closeProgressModal} type="button">
                关闭
              </button>
            </div>

            <form className="composer-form task-modal-form" onSubmit={(event) => void handleSubmitProgress(event)}>
              <label htmlFor="recurring-progress-content">
                <span>进展内容</span>
                <textarea
                  id="recurring-progress-content"
                  value={entryContent}
                  onChange={(event) => setEntryContent(event.target.value)}
                  rows={5}
                  disabled={isMutating}
                />
              </label>

              <div className="task-detail-meta">
                <div className="task-detail-meta-panel">
                  <dt>周期开始</dt>
                  <dd className="task-detail-meta-value">{formatTaskDate(activePeriod.startAt, 'YYYY-MM-DD HH:mm')}</dd>
                </div>
                <div className="task-detail-meta-panel">
                  <dt>周期结束</dt>
                  <dd className="task-detail-meta-value">{formatTaskDate(activePeriod.endAt, 'YYYY-MM-DD HH:mm')}</dd>
                </div>
              </div>

              <div className="composer-actions task-modal-actions task-modal-console-actions">
                <div className="composer-feedback">
                  {isMutating ? <span className="inline-feedback">正在保存进展...</span> : null}
                </div>
                <div className="task-modal-button-row task-modal-console-button-row">
                  <button className="secondary-button" disabled={isMutating} onClick={closeProgressModal} type="button">
                    取消
                  </button>
                  <button className="primary-button" disabled={isMutating || !entryContent.trim()} type="submit">
                    {editingEntry ? '保存进展' : '提交进展'}
                  </button>
                </div>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
  )
}
