/**
 * 文件说明：顶部任务概览入口，提供汇总指标、时间分布和按任务组统计的扩展型概览弹窗。
 */
import { useEffect, useState } from 'react'
import { buildTaskOverview } from '../features/tasks/task.overview'
import { useTaskStore } from '../stores/taskStore'

/**
 * 任务概览弹窗入口。
 */
export function TaskOverview() {
  const tasks = useTaskStore((state) => state.tasks)
  const taskGroups = useTaskStore((state) => state.taskGroups)
  const isHydrated = useTaskStore((state) => state.isHydrated)
  const activeAction = useTaskStore((state) => state.activeAction)

  const [isModalOpen, setIsModalOpen] = useState(false)

  const overview = buildTaskOverview(tasks, taskGroups)
  const busiestGroup = overview.groupItems[0] ?? null

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
            <div className="task-modal-header">
              <div>
                <p className="section-tag">任务概览</p>
                <h2 id="task-overview-title">当前任务进展</h2>
              </div>
              <button className="secondary-button modal-close-button" onClick={() => setIsModalOpen(false)} type="button">
                关闭
              </button>
            </div>

            <div className="overview-layout">
              <section className="overview-card overview-card-hero">
                <div className="overview-card-header">
                  <div>
                    <h3>完成情况</h3>
                    <p>基于当前全部任务、任务组和时间状态生成的本地快照。</p>
                  </div>
                  <span className="overview-progress-pill">{overview.completionRate}%</span>
                </div>

                <div className="overview-stat-grid">
                  <article className="overview-stat">
                    <span>总任务</span>
                    <strong>{overview.total}</strong>
                    <small>{isHydrated ? '已加载本地数据' : activeAction === 'hydrate' ? '正在读取数据' : '等待读取数据'}</small>
                  </article>
                  <article className="overview-stat">
                    <span>进行中</span>
                    <strong>{overview.active}</strong>
                    <small>仍需推进或处理</small>
                  </article>
                  <article className="overview-stat">
                    <span>已完成</span>
                    <strong>{overview.completed}</strong>
                    <small>已收尾并沉底的任务</small>
                  </article>
                  <article className="overview-stat">
                    <span>逾期 / 今天</span>
                    <strong>
                      {overview.overdue} / {overview.dueToday}
                    </strong>
                    <small>最值得优先关注的时间压力</small>
                  </article>
                </div>

                <div className="overview-progress-block">
                  <div className="overview-progress-track" aria-hidden="true">
                    <span className="overview-progress-fill" style={{ width: `${overview.completionRate}%` }} />
                  </div>
                  <p>
                    已完成 {overview.completed} / {overview.total || 0}，当前整体完成率为 {overview.completionRate}%。
                  </p>
                </div>
              </section>

              <section className="overview-card">
                <div className="overview-card-header">
                  <div>
                    <h3>按时间状态</h3>
                    <p>延续主列表的时间分组语义，方便后续继续扩成更完整的图表面板。</p>
                  </div>
                </div>

                <div className="overview-bars">
                  {overview.dueBuckets.map((bucket) => {
                    const width = overview.total > 0 ? Math.round((bucket.count / overview.total) * 100) : 0

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

              <section className="overview-card">
                <div className="overview-card-header">
                  <div>
                    <h3>按任务组</h3>
                    <p>先按任务组做基础分布，后面如果要加类别、趋势或周报，可以继续接在这一层。</p>
                  </div>
                  {busiestGroup ? <span className="meta-pill">当前最多：{busiestGroup.label}</span> : null}
                </div>

                {overview.groupItems.length > 0 ? (
                  <div className="overview-group-list">
                    {overview.groupItems.map((group) => (
                      <article key={group.id ?? 'ungrouped'} className="overview-group-item">
                        <div className="overview-group-heading">
                          <div>
                            <h4>{group.label}</h4>
                            <p>{group.description}</p>
                          </div>
                          <span>{group.total}</span>
                        </div>

                        <div className="overview-group-meter" aria-hidden="true">
                          <span
                            className="overview-group-meter-fill"
                            style={{ width: `${Math.max(group.share, group.total > 0 ? 8 : 0)}%` }}
                          />
                        </div>

                        <div className="overview-group-meta">
                          <span>进行中 {group.active}</span>
                          <span>已完成 {group.completed}</span>
                          <span>逾期 {group.overdue}</span>
                          <span>完成率 {group.completionRate}%</span>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : (
                  <div className="group-filter-empty">
                    <strong>还没有可统计的任务组</strong>
                    <p>等你创建任务和任务组后，这里会自动生成分布统计。</p>
                  </div>
                )}
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </>
  )
}
