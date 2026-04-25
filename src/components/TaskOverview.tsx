/**
 * 文件说明：顶部任务概览入口，提供汇总指标、优先级分布、趋势和周摘要的概览弹窗。
 */
import { useEffect, useState } from 'react'
import dayjs from 'dayjs'
import { buildTaskOverview } from '../features/tasks/task.overview'
import { TASK_PRIORITY_META } from '../features/tasks/task.priority'
import type { TaskPriority } from '../features/tasks/task.types'
import { useTaskStore } from '../stores/taskStore'

const PRIORITY_ORDER: TaskPriority[] = ['urgent', 'high', 'medium', 'low']

export function TaskOverview() {
  const tasks = useTaskStore((state) => state.tasks)
  const isHydrated = useTaskStore((state) => state.isHydrated)
  const activeAction = useTaskStore((state) => state.activeAction)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [trendMode, setTrendMode] = useState<'completed' | 'created-vs-completed'>('completed')

  const overview = buildTaskOverview(tasks)
  const trendMax = Math.max(
    1,
    ...overview.trend.flatMap((item) =>
      trendMode === 'completed' ? [item.completed] : [item.created, item.completed],
    ),
  )
  const reviewMonthlyMax = Math.max(1, ...overview.review.monthlyTrend.map((item) => item.completed))
  const reviewWeeklyCards = [
    { label: '近 7 天完成', value: overview.review.weekly.completed, hint: '按完成时间统计' },
    { label: '近 7 天归档', value: overview.review.weekly.archived, hint: '按归档时间统计' },
    { label: '高优先级完成', value: overview.review.weekly.highestPriorityCompleted, hint: '紧急 / 高优先级' },
    { label: '开口逾期', value: overview.review.weekly.overdueOpen, hint: '未完成且未归档' },
  ]
  const reviewQualityCards = [
    { label: '短标题', value: overview.review.quality.shortTitleCount, hint: '可能不易回忆背景' },
    { label: '重复标题', value: overview.review.quality.duplicateTitleCount, hint: '建议确认是否重复' },
    { label: '高优先级缺备注', value: overview.review.quality.highPriorityWithoutNoteCount, hint: '补充备注便于复盘' },
  ]

  useEffect(() => {
    if (!isModalOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isModalOpen])

  return (
    <>
      <button className="secondary-button overview-trigger-button" onClick={() => setIsModalOpen(true)} type="button">
        任务概览
      </button>

      {isModalOpen ? (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)} role="presentation">
          <section
            className="task-modal overview-modal"
            aria-labelledby="task-overview-title"
            aria-modal="true"
            role="dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="task-modal-header task-modal-console-header">
              <div>
                <p className="section-tag">任务概览</p>
                <h2 id="task-overview-title">当前任务进展</h2>
              </div>
              <button className="secondary-button modal-close-button" onClick={() => setIsModalOpen(false)} type="button">
                关闭
              </button>
            </div>

            <div className="overview-layout overview-console-layout">
              <section className="overview-card overview-card-hero overview-console-panel">
                <div className="overview-card-header overview-console-panel-header">
                  <div>
                    <h3>完成情况</h3>
                    <p>基于当前全部任务生成的本地快照，统计口径与列表状态保持一致。</p>
                  </div>
                  <span className="overview-progress-pill">{overview.totals.completionRate}%</span>
                </div>

                <div className="overview-stat-grid">
                  <article className="overview-stat">
                    <span>总任务</span>
                    <strong>{overview.totals.total}</strong>
                    <small>{isHydrated ? '已加载本地数据' : activeAction === 'hydrate' ? '正在读取数据' : '等待读取数据'}</small>
                  </article>
                  <article className="overview-stat">
                    <span>进行中</span>
                    <strong>{overview.totals.active}</strong>
                    <small>仍需推进或处理</small>
                  </article>
                  <article className="overview-stat">
                    <span>已完成</span>
                    <strong>{overview.totals.completed}</strong>
                    <small>已收尾并沉底的任务</small>
                  </article>
                  <article className="overview-stat">
                    <span>逾期 / 今天</span>
                    <strong>
                      {overview.totals.overdue} / {overview.totals.dueToday}
                    </strong>
                    <small>最值得优先关注的时间压力</small>
                  </article>
                </div>

                <div className="overview-progress-block">
                  <div className="overview-progress-track" aria-hidden="true">
                    <span className="overview-progress-fill" style={{ width: `${overview.totals.completionRate}%` }} />
                  </div>
                  <p>
                    已完成 {overview.totals.completed} / {overview.totals.total || 0}，当前整体完成率为 {overview.totals.completionRate}%。
                  </p>
                </div>
              </section>

              <section className="overview-card overview-console-panel">
                <div className="overview-card-header overview-console-panel-header">
                  <div>
                    <h3>优先级分布</h3>
                    <p>用于快速判断当前清单里高压事项的占比。</p>
                  </div>
                </div>

                <div className="overview-priority-list">
                  {PRIORITY_ORDER.map((priority) => {
                    const item = overview.priorityBreakdown[priority]

                    return (
                      <article key={priority} className="overview-priority-item">
                        <div className="overview-priority-header">
                          <span className={`task-console-chip is-priority is-${priority}`}>{TASK_PRIORITY_META[priority].label}</span>
                          <strong>{item.count}</strong>
                        </div>
                        <div className="overview-priority-track" aria-hidden="true">
                          <span className={`overview-priority-fill ${priority}`} style={{ width: `${Math.max(item.ratio, item.count > 0 ? 8 : 0)}%` }} />
                        </div>
                        <small>{item.ratio}%</small>
                      </article>
                    )
                  })}
                </div>
              </section>

              <section className="overview-card overview-console-panel">
                <div className="overview-card-header overview-console-panel-header">
                  <div>
                    <h3>最近 7 天趋势</h3>
                    <p>默认只看完成趋势，也可切到新增 / 完成双线对比。</p>
                  </div>

                  <div className="overview-toggle-group">
                    <button
                      className={trendMode === 'completed' ? 'secondary-button active-chip-button' : 'secondary-button'}
                      onClick={() => setTrendMode('completed')}
                      type="button"
                    >
                      仅完成
                    </button>
                    <button
                      className={trendMode === 'created-vs-completed' ? 'secondary-button active-chip-button' : 'secondary-button'}
                      onClick={() => setTrendMode('created-vs-completed')}
                      type="button"
                    >
                      新增 / 完成
                    </button>
                  </div>
                </div>

                <div className="overview-trend-list">
                  {overview.trend.map((item) => (
                    <article key={item.date} className="overview-trend-item">
                      <div className="overview-trend-heading">
                        <strong>{dayjs(item.date).format('MM-DD')}</strong>
                        <span>
                          {trendMode === 'completed'
                            ? `完成 ${item.completed}`
                            : `新增 ${item.created} / 完成 ${item.completed}`}
                        </span>
                      </div>

                      {trendMode === 'completed' ? (
                        <div className="overview-trend-track single" aria-hidden="true">
                          <span
                            className="overview-trend-bar completed"
                            style={{ width: `${Math.max(Math.round((item.completed / trendMax) * 100), item.completed > 0 ? 8 : 0)}%` }}
                          />
                        </div>
                      ) : (
                        <div className="overview-trend-dual">
                          <div className="overview-trend-track" aria-hidden="true">
                            <span
                              className="overview-trend-bar created"
                              style={{ width: `${Math.max(Math.round((item.created / trendMax) * 100), item.created > 0 ? 8 : 0)}%` }}
                            />
                          </div>
                          <div className="overview-trend-track" aria-hidden="true">
                            <span
                              className="overview-trend-bar completed"
                              style={{ width: `${Math.max(Math.round((item.completed / trendMax) * 100), item.completed > 0 ? 8 : 0)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              </section>

              <section className="overview-card overview-console-panel">
                <div className="overview-card-header overview-console-panel-header">
                  <div>
                    <h3>本周摘要</h3>
                    <p>快速查看本周新增、完成和逾期压力变化。</p>
                  </div>
                </div>

                <div className="overview-weekly-grid">
                  <article className="overview-weekly-item">
                    <span>本周新增</span>
                    <strong>{overview.weeklySummary.created}</strong>
                  </article>
                  <article className="overview-weekly-item">
                    <span>本周完成</span>
                    <strong>{overview.weeklySummary.completed}</strong>
                  </article>
                  <article className="overview-weekly-item">
                    <span>逾期变化</span>
                    <strong>{overview.weeklySummary.overdueDelta >= 0 ? `+${overview.weeklySummary.overdueDelta}` : overview.weeklySummary.overdueDelta}</strong>
                  </article>
                  <article className="overview-weekly-item">
                    <span>最高未完成优先级</span>
                    <div>
                      {overview.weeklySummary.highestOpenPriority ? (
                        <span className={`task-console-chip is-priority is-${overview.weeklySummary.highestOpenPriority}`}>
                          {TASK_PRIORITY_META[overview.weeklySummary.highestOpenPriority].label}
                        </span>
                      ) : (
                        '无'
                      )}
                    </div>
                  </article>
                </div>
              </section>

              <section className="overview-card overview-review-card overview-console-panel">
                <div className="overview-card-header overview-console-panel-header">
                  <div>
                    <h3>复盘</h3>
                    <p>从完成、归档和任务质量里提炼近期回看线索，帮助判断节奏和沉淀质量。</p>
                  </div>
                </div>

                <div className="overview-review-grid">
                  <div className="overview-review-block">
                    <div className="overview-review-heading">
                      <h4>最近完成</h4>
                      <span>Top 10</span>
                    </div>

                    {overview.review.recentCompleted.length > 0 ? (
                      <ul className="overview-review-list">
                        {overview.review.recentCompleted.map((task) => (
                          <li key={task.id}>
                            <div>
                              <strong>{task.title}</strong>
                              <small>{task.completedAt ? dayjs(task.completedAt).format('MM-DD HH:mm') : '无完成时间'}</small>
                            </div>
                            <span className={`task-console-chip is-priority is-${task.priority}`}>{TASK_PRIORITY_META[task.priority].label}</span>
                            {task.archivedAt ? <span>已归档</span> : null}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="overview-empty-state">最近还没有完成记录。</p>
                    )}
                  </div>

                  <div className="overview-review-block">
                    <div className="overview-review-heading">
                      <h4>近 7 天</h4>
                      <span>周复盘</span>
                    </div>
                    <div className="overview-review-card-grid">
                      {reviewWeeklyCards.map((item) => (
                        <article key={item.label} className="overview-review-metric">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                          <small>{item.hint}</small>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="overview-review-block">
                    <div className="overview-review-heading">
                      <h4>月度趋势</h4>
                      <span>近 6 个月</span>
                    </div>
                    <div className="overview-monthly-bars">
                      {overview.review.monthlyTrend.map((item) => (
                        <article key={item.label} className="overview-monthly-item">
                          <span>{dayjs(`${item.label}-01`).format('MM月')}</span>
                          <div className="overview-monthly-track" aria-hidden="true">
                            <span
                              className="overview-monthly-fill"
                              style={{
                                width: `${Math.max(Math.round((item.completed / reviewMonthlyMax) * 100), item.completed > 0 ? 8 : 0)}`,
                              }}
                            />
                          </div>
                          <strong>{item.completed}</strong>
                        </article>
                      ))}
                    </div>
                  </div>

                  <div className="overview-review-block">
                    <div className="overview-review-heading">
                      <h4>质量提醒</h4>
                      <span>可优化项</span>
                    </div>
                    <div className="overview-review-card-grid">
                      {reviewQualityCards.map((item) => (
                        <article key={item.label} className="overview-review-metric">
                          <span>{item.label}</span>
                          <strong>{item.value}</strong>
                          <small>{item.hint}</small>
                        </article>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="overview-card overview-console-panel">
                <div className="overview-card-header overview-console-panel-header">
                  <div>
                    <h3>时间状态</h3>
                    <p>继续沿用主列表的时间语义，辅助判断当前清单压力分布。</p>
                  </div>
                </div>

                <div className="overview-bars">
                  {overview.dueBuckets.map((bucket) => {
                    const width = overview.totals.total > 0 ? Math.round((bucket.count / overview.totals.total) * 100) : 0

                    return (
                      <article key={bucket.key} className="overview-bar-card">
                        <div className="overview-bar-header">
                          <div>
                            <strong>{bucket.label}</strong>
                            <p>{bucket.hint}</p>
                          </div>
                          <span>{bucket.count}</span>
                        </div>
                        <div className="overview-bar-track" aria-hidden="true">
                          <span
                            className="overview-bar-fill"
                            style={{ width: `${Math.max(width, bucket.count > 0 ? 8 : 0)}%` }}
                          />
                        </div>
                      </article>
                    )
                  })}
                </div>
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
