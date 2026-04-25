import type { ReminderBuckets } from '../features/tasks/task.reminders'

const GROUP_META: Array<{
  key: keyof ReminderBuckets
  title: string
  hint: string
}> = [
  { key: 'overdue', title: '已逾期', hint: '需要优先处理的到期任务。' },
  { key: 'upcoming', title: '即将到期', hint: '即将进入提醒窗口的任务。' },
  { key: 'focusWithoutDate', title: '高优先级未排期', hint: '需要补日期或进一步明确节奏。' },
  { key: 'recentlyReminded', title: '最近已提醒', hint: '保留近期提醒记录，当前阶段仅展示。' },
]

interface TaskReminderCenterProps {
  buckets: ReminderBuckets
  isOpen: boolean
  onOpenChange: (isOpen: boolean) => void
  onSelectTask: (taskId: string) => void
}

export function TaskReminderCenter({
  buckets,
  isOpen,
  onOpenChange,
  onSelectTask,
}: TaskReminderCenterProps) {
  const pendingCount = buckets.overdue.length + buckets.upcoming.length + buckets.focusWithoutDate.length
  const hasAnyReminderGroups = GROUP_META.some((group) => buckets[group.key].length > 0)
  const summaryTitle =
    pendingCount > 0
      ? `${pendingCount} 条提醒`
      : buckets.recentlyReminded.length > 0
        ? `最近已提醒 ${buckets.recentlyReminded.length} 条`
        : '当前没有提醒内容'

  return (
    <>
      <button
        aria-label="提醒中心"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        className="icon-button icon-button-console reminder-entry-button"
        onClick={() => onOpenChange(true)}
        type="button"
      >
        <span aria-hidden="true" className="icon-button-glyph">
          铃
        </span>
        <span>提醒</span>
        {pendingCount > 0 ? <strong className="icon-button-badge">{pendingCount}</strong> : null}
      </button>

      {isOpen ? (
        <div className="modal-backdrop" onClick={() => onOpenChange(false)} role="presentation">
          <section
            aria-labelledby="task-reminder-center-title"
            aria-modal="true"
            className="task-modal task-reminder-center-modal"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="task-modal-header">
              <div>
                <p className="section-tag">关注事项</p>
                <h2 id="task-reminder-center-title">提醒中心</h2>
              </div>
              <button className="secondary-button modal-close-button" onClick={() => onOpenChange(false)} type="button">
                关闭
              </button>
            </div>

            <div className="task-reminder-center-summary">
              <strong>{summaryTitle}</strong>
              <p>点击任意提醒项会直接定位到对应任务。</p>
            </div>

            <div className="task-reminder-group-list">
              {GROUP_META.filter((group) => buckets[group.key].length > 0).map((group) => (
                <section key={group.key} className="task-reminder-group">
                  <div className="task-reminder-group-header">
                    <div>
                      <h3>{group.title}</h3>
                      <p>{group.hint}</p>
                    </div>
                    <span className="task-group-count">{buckets[group.key].length}</span>
                  </div>

                  <div className="task-reminder-item-list">
                    {buckets[group.key].map((item) => (
                      <button
                        key={item.task.id}
                        className="task-reminder-item"
                        onClick={() => {
                          onSelectTask(item.task.id)
                          onOpenChange(false)
                        }}
                        type="button"
                      >
                        <div>
                          <strong>{item.task.title}</strong>
                          <p>{item.task.description || '暂无补充说明。'}</p>
                        </div>
                        <div className="task-reminder-item-meta">
                          <span className={`task-console-chip is-reminder-state is-${item.reason}`}>{item.dueLabel}</span>
                          <span className="meta-pill">{item.task.completed ? '已完成' : '待处理'}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              ))}

              {!hasAnyReminderGroups ? (
                <section className="task-reminder-empty">
                  <strong>当前没有提醒内容</strong>
                  <p>当有逾期事项、即将到期任务或高优先级未排期任务时，这里会自动展示对应分组。</p>
                </section>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
