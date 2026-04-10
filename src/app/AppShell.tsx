/**
 * 文件说明：应用主界面，负责组织待办概览、筛选和任务列表。
 */
import { useEffect } from 'react'
import { TaskComposer } from '../components/TaskComposer'
import { TaskGroupManager } from '../components/TaskGroupManager'
import { TaskList } from '../components/TaskList'
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
      <section className="topbar topbar-compact">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">
            QD
          </span>
          <div>
            <p className="eyebrow">轻单 Qingdan</p>
            <h1>桌面端任务工作台</h1>
          </div>
        </div>

        <TaskComposer />
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
                  <p>可以先从顶部的新建菜单里创建任务组。</p>
                </div>
              )}
            </div>
          </section>
        </aside>

        <section className="content-column">
          <div className="content-card panel-surface">
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

            <TaskGroupManager />
            <TaskList />
          </div>
        </section>
      </section>
    </main>
  )
}
