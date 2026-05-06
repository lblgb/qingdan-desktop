import { useEffect, useState } from 'react'
import type {
  RecurringCadenceUnit,
  RecurringPeriod,
  RecurringTask,
  RecurringTimeEntry,
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

type TimerStep = 'running' | 'note'

function getCurrentPeriod(periods: RecurringPeriod[]) {
  const now = Date.now()
  return (
    periods.find((period) => {
      const start = new Date(period.startAt).getTime()
      const end = new Date(period.endAt).getTime()
      return start <= now && now < end
    }) ?? [...periods].sort((left, right) => right.startAt.localeCompare(left.startAt))[0] ?? null
  )
}

function getCompletedMinutes(entries: RecurringTimeEntry[]) {
  return entries.reduce((total, entry) => total + entry.durationMinutes, 0)
}

function getCompletionRate(completed: number, target: number) {
  return target > 0 ? Math.round((completed / target) * 100) : 0
}

function formatMinutes(minutes: number) {
  const safeMinutes = Math.max(0, minutes)
  const hours = Math.floor(safeMinutes / 60)
  const rest = safeMinutes % 60
  return hours > 0 ? `${hours} 小时 ${rest} 分钟` : `${rest} 分钟`
}

function flattenEntries(periods: RecurringPeriod[], entriesByPeriodId: Record<string, RecurringTimeEntry[]>) {
  return periods
    .flatMap((period) =>
      (entriesByPeriodId[period.id] ?? []).map((entry) => ({
        period,
        entry,
      })),
    )
    .sort((left, right) => right.entry.startedAt.localeCompare(left.entry.startedAt))
}

export function RecurringTaskList() {
  const tasks = useRecurringStore((state) => state.tasks)
  const periodsByTaskId = useRecurringStore((state) => state.periodsByTaskId)
  const timeEntriesByPeriodId = useRecurringStore((state) => state.timeEntriesByPeriodId)
  const isMutating = useRecurringStore((state) => state.isMutating)
  const selectTask = useRecurringStore((state) => state.selectTask)
  const selectPeriod = useRecurringStore((state) => state.selectPeriod)
  const addTimeEntry = useRecurringStore((state) => state.addTimeEntry)
  const saveTimeEntryNote = useRecurringStore((state) => state.saveTimeEntryNote)
  const removeTimeEntry = useRecurringStore((state) => state.removeTimeEntry)
  const saveTask = useRecurringStore((state) => state.saveTask)
  const removeTask = useRecurringStore((state) => state.removeTask)

  const [detailTask, setDetailTask] = useState<RecurringTask | null>(null)
  const [editingTask, setEditingTask] = useState<RecurringTask | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCadenceUnit, setEditCadenceUnit] = useState<RecurringCadenceUnit>('week')
  const [editCadenceInterval, setEditCadenceInterval] = useState('1')
  const [editTargetMinutes, setEditTargetMinutes] = useState('420')
  const [editRemindAtEnd, setEditRemindAtEnd] = useState(true)
  const [editIsActive, setEditIsActive] = useState(true)

  const [editingEntry, setEditingEntry] = useState<RecurringTimeEntry | null>(null)
  const [editingEntryNote, setEditingEntryNote] = useState('')

  const [timerTask, setTimerTask] = useState<RecurringTask | null>(null)
  const [timerPeriod, setTimerPeriod] = useState<RecurringPeriod | null>(null)
  const [timerStep, setTimerStep] = useState<TimerStep>('running')
  const [timerStartedAt, setTimerStartedAt] = useState<string | null>(null)
  const [timerEndedAt, setTimerEndedAt] = useState<string | null>(null)
  const [timerRunningSince, setTimerRunningSince] = useState<number | null>(null)
  const [timerPausedAccumulatedMs, setTimerPausedAccumulatedMs] = useState(0)
  const [timerPausedAt, setTimerPausedAt] = useState<number | null>(null)
  const [timerTick, setTimerTick] = useState(0)
  const [timerNote, setTimerNote] = useState('')

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        closeDetailModal()
        closeEditModal()
        closeEntryEditModal()
      }
    }

    if (detailTask || editingTask || editingEntry) {
      window.addEventListener('keydown', handleKeyDown)
    }

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [detailTask, editingTask, editingEntry])

  useEffect(() => {
    if (!timerTask || timerStep !== 'running' || timerPausedAt) {
      return
    }

    const interval = window.setInterval(() => setTimerTick((value) => value + 1), 1000)
    return () => window.clearInterval(interval)
  }, [timerPausedAt, timerStep, timerTask])

  async function ensureTaskHistoryLoaded(task: RecurringTask) {
    await selectTask(task.id)
    const periods = periodsByTaskId[task.id] ?? []
    await Promise.all(periods.map((period) => selectPeriod(period.id)))
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
    setEditTargetMinutes(String(task.targetMinutesPerPeriod))
    setEditRemindAtEnd(task.remindAtEnd)
    setEditIsActive(task.isActive)
  }

  function closeEditModal() {
    setEditingTask(null)
    setEditTitle('')
    setEditDescription('')
    setEditCadenceUnit('week')
    setEditCadenceInterval('1')
    setEditTargetMinutes('420')
    setEditRemindAtEnd(true)
    setEditIsActive(true)
  }

  function openEntryEditModal(entry: RecurringTimeEntry) {
    setEditingEntry(entry)
    setEditingEntryNote(entry.note)
  }

  function closeEntryEditModal() {
    setEditingEntry(null)
    setEditingEntryNote('')
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
      targetMinutesPerPeriod: Math.max(1, Number(editTargetMinutes) || 420),
      remindAtEnd: editRemindAtEnd,
      isActive: editIsActive,
    })

    closeEditModal()
  }

  async function handleSubmitEntryNote(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingEntry) {
      return
    }

    await saveTimeEntryNote({ id: editingEntry.id, note: editingEntryNote })
    closeEntryEditModal()
  }

  async function handleRemoveEntry(entry: RecurringTimeEntry) {
    if (!window.confirm('删除这条时间记录会影响本周期完成率，确认删除？')) {
      return
    }

    await removeTimeEntry(entry.id)
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

  function openTimer(task: RecurringTask, period: RecurringPeriod) {
    void selectTask(task.id)
    void selectPeriod(period.id)
    const nowIso = new Date().toISOString()
    setTimerTask(task)
    setTimerPeriod(period)
    setTimerStep('running')
    setTimerStartedAt(nowIso)
    setTimerEndedAt(null)
    setTimerRunningSince(Date.now())
    setTimerPausedAccumulatedMs(0)
    setTimerPausedAt(null)
    setTimerTick(0)
    setTimerNote('')
  }

  function closeTimer() {
    setTimerTask(null)
    setTimerPeriod(null)
    setTimerStep('running')
    setTimerStartedAt(null)
    setTimerEndedAt(null)
    setTimerRunningSince(null)
    setTimerPausedAccumulatedMs(0)
    setTimerPausedAt(null)
    setTimerTick(0)
    setTimerNote('')
  }

  function calculateTimerDurationMinutes(nowMs = Date.now()) {
    if (!timerRunningSince) {
      return 0
    }

    const pausedMs = timerPausedAt ? timerPausedAccumulatedMs + (nowMs - timerPausedAt) : timerPausedAccumulatedMs
    const elapsedMs = Math.max(0, nowMs - timerRunningSince - pausedMs)
    return Math.floor(elapsedMs / 60_000)
  }

  function toggleTimerPause() {
    if (timerPausedAt) {
      setTimerPausedAccumulatedMs((value) => value + Date.now() - timerPausedAt)
      setTimerPausedAt(null)
      return
    }

    setTimerPausedAt(Date.now())
  }

  function finishTimer() {
    const durationMinutes = calculateTimerDurationMinutes()
    if (durationMinutes < 1) {
      closeTimer()
      return
    }

    setTimerEndedAt(new Date().toISOString())
    setTimerStep('note')
  }

  function exitTimer() {
    if (calculateTimerDurationMinutes() < 1 || window.confirm('本次计时已超过 1 分钟，确认丢弃并退出？')) {
      closeTimer()
    }
  }

  async function saveTimerEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!timerPeriod || !timerStartedAt) {
      return
    }

    const endedAt = timerEndedAt ?? new Date().toISOString()
    const durationMinutes = calculateTimerDurationMinutes()
    if (durationMinutes < 1) {
      closeTimer()
      return
    }

    await addTimeEntry({
      periodId: timerPeriod.id,
      startedAt: timerStartedAt,
      endedAt,
      durationMinutes,
      note: timerNote.trim(),
    })
    closeTimer()
  }

  if (tasks.length === 0) {
    return (
      <section className="task-list-card empty-state">
        <p className="section-tag">周期任务</p>
        <h2>还没有周期任务</h2>
        <p>从顶部“新建”菜单里创建周期任务后，这里会显示每个周期的计时完成情况。</p>
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
          <p className="section-note">共 {tasks.length} 项，列表展示当前周期目标、已完成时间和最近一条时间记录。</p>
        </div>

        <div className="task-group-list">
          <section className="task-group">
            <ul className="task-list">
              {tasks.map((task) => {
                const periods = periodsByTaskId[task.id] ?? []
                const currentPeriod = getCurrentPeriod(periods)
                const entries = currentPeriod ? timeEntriesByPeriodId[currentPeriod.id] ?? [] : []
                const completedMinutes = getCompletedMinutes(entries)
                const remainingMinutes = Math.max(task.targetMinutesPerPeriod - completedMinutes, 0)
                const completionRate = getCompletionRate(completedMinutes, task.targetMinutesPerPeriod)
                const isCompleted = completedMinutes >= task.targetMinutesPerPeriod
                const latestEntry = [...entries].sort((left, right) => right.startedAt.localeCompare(left.startedAt))[0] ?? null

                return (
                  <li key={task.id} className={isCompleted ? 'task-item completed' : 'task-item'} data-recurring-task-id={task.id}>
                    <div className="task-module-card">
                      <div className="task-body">
                        <div className="task-main-row task-module-header">
                          <span className={isCompleted ? 'task-console-chip task-state-chip is-done' : 'task-console-chip task-state-chip is-active'}>
                            {isCompleted ? '本周期已达标' : `还差 ${formatMinutes(remainingMinutes)}`}
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
                              <span className="task-console-chip is-meta">
                                {completedMinutes} / {task.targetMinutesPerPeriod} 分钟
                              </span>
                              <span className="task-console-chip is-meta">{completionRate}%</span>
                            </>
                          ) : (
                            <span className="task-console-chip is-meta">等待生成周期</span>
                          )}
                        </div>

                        <div className="overview-progress-track" aria-hidden="true">
                          <span className="overview-progress-fill" style={{ width: `${Math.min(completionRate, 100)}%` }} />
                        </div>

                        {latestEntry ? (
                          <div className="recurring-latest-entry">
                            <span>
                              最近记录 · {formatTaskDate(latestEntry.startedAt, 'YYYY-MM-DD HH:mm')} · {latestEntry.durationMinutes} 分钟
                            </span>
                            <p>{latestEntry.note || '未填写说明'}</p>
                          </div>
                        ) : null}
                      </div>

                      <div className="task-actions task-actions-console">
                        {currentPeriod ? (
                          <button
                            className="primary-button"
                            data-testid="start-recurring-timer"
                            disabled={isMutating}
                            onClick={() => openTimer(task, currentPeriod)}
                            type="button"
                          >
                            开始计时
                          </button>
                        ) : (
                          <button className="secondary-button" disabled type="button">
                            等待周期
                          </button>
                        )}
                        <button
                          className="secondary-button"
                          data-testid="recurring-detail-button"
                          onClick={() => void openDetailModal(task)}
                          type="button"
                          disabled={isMutating}
                        >
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
                    <span className="task-console-chip is-meta">目标 {detailTask.targetMinutesPerPeriod} 分钟</span>
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
              <section className="task-detail-section">
                <div className="recurring-history-heading">
                  <div>
                    <h3>历史时间记录</h3>
                    <p className="section-note">按周期分组展示，说明可修改，记录可删除。</p>
                  </div>
                  <span className="task-console-chip is-meta">
                    {flattenEntries(periodsByTaskId[detailTask.id] ?? [], timeEntriesByPeriodId).length} 条
                  </span>
                </div>

                {(periodsByTaskId[detailTask.id] ?? []).length > 0 ? (
                  <div className="recurring-history-timeline">
                    {(periodsByTaskId[detailTask.id] ?? []).map((period) => {
                      const entries = timeEntriesByPeriodId[period.id] ?? []
                      const completedMinutes = getCompletedMinutes(entries)
                      const rate = getCompletionRate(completedMinutes, detailTask.targetMinutesPerPeriod)

                      return (
                        <article key={period.id} className="recurring-history-card">
                          <div className="recurring-history-header">
                            <div>
                              <span className="task-console-chip is-meta">
                                {formatTaskDate(period.startAt, 'YYYY-MM-DD HH:mm')} - {formatTaskDate(period.endAt, 'YYYY-MM-DD HH:mm')}
                              </span>
                              <small>
                                {completedMinutes} / {detailTask.targetMinutesPerPeriod} 分钟 · {rate}%
                              </small>
                            </div>
                          </div>

                          {entries.length > 0 ? (
                            <ul className="recurring-entry-list">
                              {entries.map((entry) => (
                                <li key={entry.id}>
                                  <div>
                                    <strong>{entry.durationMinutes} 分钟</strong>
                                    <span>
                                      {formatTaskDate(entry.startedAt, 'HH:mm')} - {formatTaskDate(entry.endedAt, 'HH:mm')}
                                    </span>
                                    <p>{entry.note || '未填写说明'}</p>
                                  </div>
                                  <div className="task-modal-button-row">
                                    <button className="secondary-button" onClick={() => openEntryEditModal(entry)} type="button" disabled={isMutating}>
                                      修改
                                    </button>
                                    <button className="ghost-button" onClick={() => void handleRemoveEntry(entry)} type="button" disabled={isMutating}>
                                      删除
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="section-note">这个周期还没有时间记录。</p>
                          )}
                        </article>
                      )
                    })}
                  </div>
                ) : (
                  <p className="section-note">还没有周期记录。</p>
                )}
              </section>
            </div>
          </section>
        </div>
      ) : null}

      {editingTask ? (
        <div className="modal-backdrop" onClick={closeEditModal} role="presentation">
          <section className="task-modal" aria-labelledby="recurring-edit-title" aria-modal="true" role="dialog" onClick={(event) => event.stopPropagation()}>
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
                <textarea id="recurring-edit-task-description" value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={4} disabled={isMutating} />
              </label>

              <div className="task-modal-grid">
                <label htmlFor="recurring-edit-task-interval">
                  <span>周期步长</span>
                  <input id="recurring-edit-task-interval" type="number" min={1} value={editCadenceInterval} onChange={(event) => setEditCadenceInterval(event.target.value)} disabled={isMutating} />
                </label>

                <label htmlFor="recurring-edit-task-unit">
                  <span>周期单位</span>
                  <select id="recurring-edit-task-unit" value={editCadenceUnit} onChange={(event) => setEditCadenceUnit(event.target.value as RecurringCadenceUnit)} disabled={isMutating}>
                    {CADENCE_OPTIONS.map((unit) => (
                      <option key={unit} value={unit}>
                        {CADENCE_LABELS[unit]}
                      </option>
                    ))}
                  </select>
                </label>

                <label htmlFor="recurring-edit-target-minutes">
                  <span>每周期目标分钟数</span>
                  <input id="recurring-edit-target-minutes" type="number" min={1} value={editTargetMinutes} onChange={(event) => setEditTargetMinutes(event.target.value)} disabled={isMutating} />
                </label>
              </div>

              <div className="recurring-toggle-grid">
                <label className="task-settings-toggle" htmlFor="recurring-edit-reminder">
                  <input id="recurring-edit-reminder" type="checkbox" checked={editRemindAtEnd} onChange={(event) => setEditRemindAtEnd(event.target.checked)} disabled={isMutating} />
                  <span>周期结束时提醒</span>
                </label>

                <label className="task-settings-toggle" htmlFor="recurring-edit-active">
                  <input id="recurring-edit-active" type="checkbox" checked={editIsActive} onChange={(event) => setEditIsActive(event.target.checked)} disabled={isMutating} />
                  <span>启用这个周期任务</span>
                </label>
              </div>

              <div className="composer-actions task-modal-actions task-modal-console-actions">
                <div className="composer-feedback">{isMutating ? <span className="inline-feedback">正在保存周期任务...</span> : null}</div>
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

      {editingEntry ? (
        <div className="modal-backdrop" onClick={closeEntryEditModal} role="presentation">
          <section className="task-modal" aria-labelledby="recurring-entry-edit-title" aria-modal="true" role="dialog" onClick={(event) => event.stopPropagation()}>
            <div className="task-modal-header task-modal-console-header">
              <div>
                <p className="section-tag">时间记录</p>
                <h2 id="recurring-entry-edit-title">修改记录说明</h2>
              </div>
              <button className="secondary-button modal-close-button" disabled={isMutating} onClick={closeEntryEditModal} type="button">
                关闭
              </button>
            </div>

            <form className="composer-form task-modal-form" onSubmit={(event) => void handleSubmitEntryNote(event)}>
              <label htmlFor="recurring-entry-note">
                <span>说明</span>
                <textarea id="recurring-entry-note" value={editingEntryNote} onChange={(event) => setEditingEntryNote(event.target.value)} rows={5} disabled={isMutating} />
              </label>
              <div className="task-modal-button-row task-modal-console-button-row">
                <button className="secondary-button" disabled={isMutating} onClick={closeEntryEditModal} type="button">
                  取消
                </button>
                <button className="primary-button" disabled={isMutating} type="submit">
                  保存说明
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {timerTask && timerPeriod ? (
        <div className="modal-backdrop timer-backdrop" onClick={exitTimer} role="presentation">
          <section className="task-modal recurring-timer-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="task-modal-header task-modal-console-header">
              <div>
                <p className="section-tag">周期任务计时</p>
                <h2>{timerTask.title}</h2>
              </div>
              <button className="secondary-button modal-close-button" onClick={exitTimer} type="button" disabled={isMutating}>
                退出
              </button>
            </div>

            {timerStep === 'running' ? (
              <div className="recurring-timer-body">
                <div className="task-detail-meta">
                  <div className="task-detail-meta-panel">
                    <dt>本周期目标</dt>
                    <dd className="task-detail-meta-value">{timerTask.targetMinutesPerPeriod} 分钟</dd>
                  </div>
                  <div className="task-detail-meta-panel">
                    <dt>本次已计时</dt>
                    <dd className="task-detail-meta-value">{formatMinutes(calculateTimerDurationMinutes())}</dd>
                  </div>
                </div>
                <strong className="recurring-timer-clock" aria-live="polite">
                  {formatMinutes(calculateTimerDurationMinutes())}
                  <span className="is-hidden">{timerTick}</span>
                </strong>
                <div className="task-modal-button-row task-modal-console-button-row">
                  <button className="secondary-button" onClick={toggleTimerPause} type="button">
                    {timerPausedAt ? '继续' : '暂停'}
                  </button>
                  <button className="primary-button" data-testid="finish-recurring-timer" onClick={finishTimer} type="button">
                    结束并记录
                  </button>
                  <button className="ghost-button" onClick={exitTimer} type="button">
                    退出
                  </button>
                </div>
              </div>
            ) : (
              <form className="composer-form task-modal-form" onSubmit={(event) => void saveTimerEntry(event)}>
                <div className="task-detail-meta">
                  <div className="task-detail-meta-panel">
                    <dt>净计时</dt>
                    <dd className="task-detail-meta-value">{formatMinutes(calculateTimerDurationMinutes())}</dd>
                  </div>
                  <div className="task-detail-meta-panel">
                    <dt>结束时间</dt>
                    <dd className="task-detail-meta-value">{timerEndedAt ? formatTaskDate(timerEndedAt, 'YYYY-MM-DD HH:mm') : '-'}</dd>
                  </div>
                </div>
                <label htmlFor="recurring-time-entry-note">
                  <span>进展说明</span>
                  <textarea id="recurring-time-entry-note" value={timerNote} onChange={(event) => setTimerNote(event.target.value)} rows={5} disabled={isMutating} />
                </label>
                <div className="task-modal-button-row task-modal-console-button-row">
                  <button className="secondary-button" onClick={closeTimer} disabled={isMutating} type="button">
                    丢弃
                  </button>
                  <button className="primary-button" data-testid="save-recurring-time-entry" disabled={isMutating} type="submit">
                    保存时间记录
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      ) : null}
    </>
  )
}
