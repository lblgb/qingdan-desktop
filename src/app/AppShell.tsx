/**
 * 文件说明：应用主界面，负责组织待办概览、筛选和任务列表。
 */
import { useEffect } from 'react'
import { TaskComposer } from '../components/TaskComposer'
import { TaskList } from '../components/TaskList'
import { formatTaskDate } from '../lib/date'
import { useTaskStore } from '../stores/taskStore'

const FILTER_OPTIONS = [
  { key: 'all', label: '全部任务', hint: '查看完整清单' },
  { key: 'active', label: '进行中', hint: '聚焦待处理事项' },
  { key: 'completed', label: '已完成', hint: '回顾已收尾工作' },
] as const

/**
 * 应用壳组件。
 */
export function AppShell() {
  const tasks = useTaskStore((state) => state.tasks)
  const activeFilter = useTaskStore((state) => state.activeFilter)
  const isHydrated = useTaskStore((state) => state.isHydrated)
  const isLoading = useTaskStore((state) => state.isLoading)
  const activeAction = useTaskStore((state) => state.activeAction)
  const feedback = useTaskStore((state) => state.feedback)
  const hydrateTasks = useTaskStore((state) => state.hydrateTasks)
  const setFilter = useTaskStore((state) => state.setFilter)
  const dismissFeedback = useTaskStore((state) => state.dismissFeedback)

  useEffect(() => {
    void hydrateTasks()
  }, [hydrateTasks])

  const totalCount = tasks.length
  const completedCount = tasks.filter((task) => task.completed).length
  const activeCount = totalCount - completedCount
  const nextTask = tasks.find((task) => !task.completed)
  const scheduledCount = tasks.filter((task) => !task.completed && task.dueAt).length
  const overdueCount = tasks.filter((task) => {
    if (task.completed || !task.dueAt) {
      return false
    }

    return new Date(task.dueAt).getTime() < Date.now()
  }).length
  const completionRate = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100)

  const filterCounts = {
    all: totalCount,
    active: activeCount,
    completed: completedCount,
  }
  const statusNotice =
    activeAction === 'hydrate'
      ? { tone: 'info' as const, message: '正在读取本地任务数据...' }
      : feedback

  return (
    <main className="app-shell">
      <section className="topbar">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">
            QD
          </span>
          <div>
            <p className="eyebrow">轻单 Qingdan</p>
            <h1>桌面端任务工作台</h1>
          </div>
        </div>

        <div className="topbar-meta">
          <span className="meta-pill">本地优先</span>
          <span className="meta-pill">Tauri 已可运行</span>
          <span className="meta-date">{new Date().toLocaleDateString('zh-CN')}</span>
        </div>
      </section>

      <section className="hero-panel">
        <div className="hero-copy-block panel-surface panel-strong">
          <p className="section-tag">当前阶段</p>
          <h2>先把每天最常用的录入、查看和完成动作打磨顺手。</h2>
          <p className="hero-copy">
            这一版先聚焦桌面端任务流的基础体验：快速记一条、立刻筛选、稳定完成。数据层后续再从
            `localStorage` 切换到 `Tauri + SQLite`。
          </p>
          <div className="hero-points">
            <span>更清晰的任务层级</span>
            <span>更紧凑的列表密度</span>
            <span>更明确的状态反馈</span>
          </div>
        </div>

        <div className="hero-grid">
          <article className="stat-card stat-card-primary">
            <span>全部任务</span>
            <strong>{totalCount}</strong>
            <small>当前项目内的完整任务量</small>
          </article>
          <article className="stat-card">
            <span>进行中</span>
            <strong>{activeCount}</strong>
            <small>正在等待处理的事项</small>
          </article>
          <article className="stat-card">
            <span>已排期</span>
            <strong>{scheduledCount}</strong>
            <small>已设置明确截止日期</small>
          </article>
          <article className="stat-card">
            <span>完成率</span>
            <strong>{completionRate}%</strong>
            <small>{completedCount} 项已经完成</small>
          </article>
          <article className="stat-card stat-card-focus">
            <span>下一项优先任务</span>
            <strong>{nextTask ? nextTask.title : '暂无任务'}</strong>
            <small>{nextTask?.dueAt ? formatTaskDate(nextTask.dueAt) : '可以开始录入新的待办'}</small>
          </article>
          <article className="stat-card stat-card-warning">
            <span>逾期提醒</span>
            <strong>{overdueCount}</strong>
            <small>{overdueCount > 0 ? '建议优先处理已过期事项' : '当前没有已过期任务'}</small>
          </article>
        </div>
      </section>

      <section className="workspace-panel">
        <aside className="sidebar-stack">
          <section className="sidebar-card panel-surface">
            <div className="sidebar-heading">
              <div>
                <p className="section-tag">工作视图</p>
                <h2>筛选当前清单</h2>
              </div>
              <span className="sidebar-count">{filterCounts[activeFilter]}</span>
            </div>

            <div className="filter-list">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  className={option.key === activeFilter ? 'filter-button active' : 'filter-button'}
                  onClick={() => setFilter(option.key)}
                  type="button"
                >
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                  <strong>{filterCounts[option.key]}</strong>
                </button>
              ))}
            </div>
          </section>

          <section className="sidebar-card panel-surface panel-muted">
            <p className="section-tag">今日节奏</p>
            <h2>保持单点推进</h2>
            <ul className="focus-list">
              <li>先录入最明确、最可执行的一件事。</li>
              <li>给关键任务补截止日期，便于后续排序。</li>
              <li>完成后立即勾选，减少列表噪音。</li>
            </ul>
          </section>
        </aside>

        <section className="content-column">
          <div className="content-card panel-surface">
          <div className="content-overview">
            <div>
              <p className="section-tag">任务概览</p>
              <h2>把今天要处理的事放在一个稳定的工作台里</h2>
            </div>
            <p className="section-note">
              {isHydrated
                ? '当前已经完成 Tauri 环境修复，真实数据层接入正在按阶段推进。'
                : isLoading
                  ? '正在加载本地任务数据...'
                  : '任务数据尚未完成初始化，可重试读取本地数据。'}
            </p>
          </div>

          {statusNotice ? (
            <div className={`status-banner ${statusNotice.tone}`}>
              <p>{statusNotice.message}</p>
              {statusNotice.tone === 'error' && !isHydrated ? (
                <button className="secondary-button" onClick={() => void hydrateTasks()} type="button">
                  重试读取
                </button>
              ) : feedback ? (
                <button className="secondary-button" onClick={dismissFeedback} type="button">
                  知道了
                </button>
              ) : null}
            </div>
          ) : null}

            <TaskComposer />
            <TaskList />
          </div>
        </section>
      </section>
    </main>
  )
}
