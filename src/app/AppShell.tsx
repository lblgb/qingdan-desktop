/**
 * 文件说明：应用主界面，负责组织待办概览、筛选和任务列表。
 */
import { useEffect } from 'react'
import { TaskComposer } from '../components/TaskComposer'
import { TaskGroupManager } from '../components/TaskGroupManager'
import { TaskList } from '../components/TaskList'
import { formatTaskDate } from '../lib/date'
import { useTaskStore } from '../stores/taskStore'

const FILTER_OPTIONS = [
  { key: 'all', label: '全部任务', hint: '查看完整清单' },
  { key: 'active', label: '进行中', hint: '聚焦待处理事项' },
  { key: 'completed', label: '已完成', hint: '回顾已收尾工作' },
] as const

const GROUP_FILTER_OPTIONS = [
  { key: 'all-groups', label: '全部组', hint: '不过滤任务归属' },
  { key: 'ungrouped', label: '未分组', hint: '查看还没归组的任务' },
] as const

/**
 * 应用壳组件。
 */
export function AppShell() {
  const tasks = useTaskStore((state) => state.tasks)
  const taskGroups = useTaskStore((state) => state.taskGroups)
  const activeFilter = useTaskStore((state) => state.activeFilter)
  const activeGroupFilter = useTaskStore((state) => state.activeGroupFilter)
  const isHydrated = useTaskStore((state) => state.isHydrated)
  const isLoading = useTaskStore((state) => state.isLoading)
  const activeAction = useTaskStore((state) => state.activeAction)
  const feedback = useTaskStore((state) => state.feedback)
  const hydrateTasks = useTaskStore((state) => state.hydrateTasks)
  const setFilter = useTaskStore((state) => state.setFilter)
  const setGroupFilter = useTaskStore((state) => state.setGroupFilter)
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
  const statusScopedTasks =
    activeFilter === 'active'
      ? tasks.filter((task) => !task.completed)
      : activeFilter === 'completed'
        ? tasks.filter((task) => task.completed)
        : tasks
  const groupFilterCounts = {
    'all-groups': statusScopedTasks.length,
    ungrouped: statusScopedTasks.filter((task) => !task.groupId).length,
  }
  const dynamicGroupOptions = taskGroups.map((group) => ({
    key: group.id,
    label: group.name,
    hint: group.description || '聚焦这一组中的任务',
    count: statusScopedTasks.filter((task) => task.groupId === group.id).length,
  }))
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
            当前已经从基础待办进入第二版组织能力升级：先把状态筛选和任务组筛选接起来，再继续收口弹窗新建与组管理。
          </p>
          <div className="hero-points">
            <span>更清晰的任务层级</span>
            <span>更紧凑的列表密度</span>
            <span>更稳定的组内整理</span>
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

          <section className="sidebar-card panel-surface">
            <div className="sidebar-heading">
              <div>
                <p className="section-tag">任务组</p>
                <h2>筛选任务归属</h2>
              </div>
              <span className="sidebar-count">
                {activeGroupFilter === 'all-groups'
                  ? taskGroups.length
                  : activeGroupFilter === 'ungrouped'
                    ? groupFilterCounts.ungrouped
                    : dynamicGroupOptions.find((group) => group.key === activeGroupFilter)?.count ?? 0}
              </span>
            </div>

            <div className="filter-list">
              {GROUP_FILTER_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  className={option.key === activeGroupFilter ? 'filter-button active' : 'filter-button'}
                  onClick={() => setGroupFilter(option.key)}
                  type="button"
                >
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                  <strong>{groupFilterCounts[option.key]}</strong>
                </button>
              ))}

              {dynamicGroupOptions.length > 0 ? (
                dynamicGroupOptions.map((group) => (
                  <button
                    key={group.key}
                    className={group.key === activeGroupFilter ? 'filter-button active' : 'filter-button'}
                    onClick={() => setGroupFilter(group.key)}
                    type="button"
                  >
                    <span>{group.label}</span>
                    <small>{group.hint}</small>
                    <strong>{group.count}</strong>
                  </button>
                ))
              ) : (
                <div className="group-filter-empty">
                  <strong>还没有任务组</strong>
                  <p>下一轮会补上组管理入口，当前先把筛选与归组链路接通。</p>
                </div>
              )}
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
                ? '当前任务和任务组都已进入真实数据层，筛选语义正在按第二版规划继续扩展。'
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
            <TaskGroupManager />
            <TaskList />
          </div>
        </section>
      </section>
    </main>
  )
}
