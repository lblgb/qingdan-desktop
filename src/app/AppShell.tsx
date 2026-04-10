/**
 * 文件说明：应用主界面，负责组织顶部动作、工作视图筛选和任务清单。
 */
import { useEffect, useMemo, useState } from 'react'
import { TaskComposer } from '../components/TaskComposer'
import { TaskGroupManager } from '../components/TaskGroupManager'
import { TaskList } from '../components/TaskList'
import { TaskOverview } from '../components/TaskOverview'
import { useTaskStore } from '../stores/taskStore'

const FILTER_OPTIONS = [
  { key: 'all', label: '全部任务', hint: '查看完整清单' },
  { key: 'active', label: '进行中', hint: '聚焦待处理事项' },
  { key: 'completed', label: '已完成', hint: '回看已经收尾的任务' },
] as const

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

  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false)
  const [activeConditionPanel, setActiveConditionPanel] = useState<'root' | 'groups'>('root')

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

  const dynamicGroupOptions = useMemo(
    () =>
      taskGroups.map((group) => ({
        key: group.id,
        label: group.name,
        hint: group.description || '聚焦这一组中的任务',
        count: statusScopedTasks.filter((task) => task.groupId === group.id).length,
      })),
    [statusScopedTasks, taskGroups],
  )

  const activeGroupFilterLabel =
    activeGroupFilter === 'all-groups'
      ? '全部组'
      : activeGroupFilter === 'ungrouped'
        ? '未分组'
        : dynamicGroupOptions.find((group) => group.key === activeGroupFilter)?.label ?? '任务组'

  const statusNotice =
    activeAction === 'hydrate'
      ? { tone: 'info' as const, message: '正在读取本地任务数据...' }
      : feedback

  function handleToggleMoreFilters() {
    setIsMoreFiltersOpen((current) => {
      const next = !current
      if (next) {
        setActiveConditionPanel('root')
      }
      return next
    })
  }

  function handleSelectGroupFilter(filter: typeof activeGroupFilter) {
    setGroupFilter(filter)
    setIsMoreFiltersOpen(false)
    setActiveConditionPanel('root')
  }

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

        <div className="topbar-actions">
          <TaskOverview />
          <TaskGroupManager />
          <TaskComposer />
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

              <button
                className={isMoreFiltersOpen || activeGroupFilter !== 'all-groups' ? 'filter-button active' : 'filter-button'}
                onClick={handleToggleMoreFilters}
                type="button"
              >
                <span>更多条件</span>
                <small>
                  {activeGroupFilter === 'all-groups' ? '收纳任务组和后续附加筛选' : `当前已按 ${activeGroupFilterLabel} 筛选`}
                </small>
                <strong>{activeGroupFilter === 'all-groups' ? '...' : activeGroupFilterLabel}</strong>
              </button>

              {isMoreFiltersOpen ? (
                <div className="nested-filter-panel">
                  {activeConditionPanel === 'root' ? (
                    <div className="nested-filter-list">
                      <button className="nested-filter-button" onClick={() => setActiveConditionPanel('groups')} type="button">
                        <span>任务组</span>
                        <small>按任务归属进一步筛选清单</small>
                        <strong>{activeGroupFilterLabel}</strong>
                      </button>
                    </div>
                  ) : (
                    <div className="nested-filter-list">
                      <div className="nested-filter-toolbar">
                        <button className="nested-filter-back" onClick={() => setActiveConditionPanel('root')} type="button">
                          返回
                        </button>
                        <span>任务组</span>
                      </div>

                      <button
                        className={activeGroupFilter === 'all-groups' ? 'nested-filter-button active' : 'nested-filter-button'}
                        onClick={() => handleSelectGroupFilter('all-groups')}
                        type="button"
                      >
                        <span>全部组</span>
                        <small>不过滤任务归属</small>
                        <strong>{groupFilterCounts['all-groups']}</strong>
                      </button>

                      <button
                        className={activeGroupFilter === 'ungrouped' ? 'nested-filter-button active' : 'nested-filter-button'}
                        onClick={() => handleSelectGroupFilter('ungrouped')}
                        type="button"
                      >
                        <span>未分组</span>
                        <small>查看还未归组的任务</small>
                        <strong>{groupFilterCounts.ungrouped}</strong>
                      </button>

                      {dynamicGroupOptions.length > 0 ? (
                        dynamicGroupOptions.map((group) => (
                          <button
                            key={group.key}
                            className={activeGroupFilter === group.key ? 'nested-filter-button active' : 'nested-filter-button'}
                            onClick={() => handleSelectGroupFilter(group.key)}
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
                          <p>可以从顶部的任务组管理里新增任务组。</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : null}
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

            <TaskList />
          </div>
        </section>
      </section>
    </main>
  )
}
