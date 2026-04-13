/**
 * 文件说明：应用主界面，负责组织顶部动作、工作视图筛选和任务清单。
 */
import { useEffect, useMemo, useState } from 'react'
import { TaskComposer } from '../components/TaskComposer'
import { TaskGroupManager } from '../components/TaskGroupManager'
import { TaskList } from '../components/TaskList'
import { TaskOverview } from '../components/TaskOverview'
import { DEFAULT_TASK_QUERY, applyTaskQuery, summarizeFilters } from '../features/tasks/task.filters'
import { TASK_PRIORITY_META } from '../features/tasks/task.priority'
import type {
  TaskDateRangeFilter,
  TaskFilter,
  TaskGroupFilter,
  TaskPriorityFilter,
  TaskSortBy,
} from '../features/tasks/task.types'
import { useTaskStore } from '../stores/taskStore'

const FILTER_OPTIONS: Array<{ key: TaskFilter; label: string; hint: string }> = [
  { key: 'all', label: '全部任务', hint: '查看完整清单' },
  { key: 'active', label: '进行中', hint: '聚焦待处理事项' },
  { key: 'completed', label: '已完成', hint: '回看已经收尾的任务' },
]

const PRIORITY_OPTIONS: Array<{ key: TaskPriorityFilter; label: string; hint: string }> = [
  { key: 'all-priorities', label: '全部优先级', hint: '不过滤任务紧急程度' },
  { key: 'urgent', label: '紧急', hint: '需要尽快处理的任务' },
  { key: 'high', label: '高', hint: '重要但可稍后处理' },
  { key: 'medium', label: '中', hint: '默认优先级任务' },
  { key: 'low', label: '低', hint: '低压力或可延后事项' },
]

const DATE_RANGE_OPTIONS: Array<{ key: TaskDateRangeFilter; label: string; hint: string }> = [
  { key: 'all-time', label: '全部时间', hint: '不过滤日期信息' },
  { key: 'today', label: '今天', hint: '只看今天到期的任务' },
  { key: 'upcoming', label: '未来 7 天', hint: '只看接下来一周内到期的任务' },
  { key: 'overdue', label: '已逾期', hint: '优先查看已经超期的任务' },
  { key: 'no-date', label: '无日期', hint: '只看还未设置日期的任务' },
]

const SORT_OPTIONS: Array<{ key: TaskSortBy; label: string; hint: string; shortLabel: string }> = [
  { key: 'default', label: '默认推荐', hint: '保持时间语义与最近更新的综合排序', shortLabel: '推荐' },
  { key: 'due-date', label: '截止日期优先', hint: '更突出临近截止日期的任务', shortLabel: '到期' },
  { key: 'priority', label: '优先级优先', hint: '更突出紧急和高优先级任务', shortLabel: '优先级' },
  { key: 'updated', label: '最近更新', hint: '先看最近处理过的任务', shortLabel: '更新' },
]

type ConditionPanel = 'root' | 'groups' | 'priority' | 'date-range' | 'sort'

function dateRangeLabel(dateRange: TaskDateRangeFilter) {
  return DATE_RANGE_OPTIONS.find((option) => option.key === dateRange)?.label ?? '全部时间'
}

function sortLabel(sortBy: TaskSortBy) {
  return SORT_OPTIONS.find((option) => option.key === sortBy)?.label ?? '默认推荐'
}

export function AppShell() {
  const tasks = useTaskStore((state) => state.tasks)
  const taskGroups = useTaskStore((state) => state.taskGroups)
  const activeFilter = useTaskStore((state) => state.activeFilter)
  const activeGroupFilter = useTaskStore((state) => state.activeGroupFilter)
  const activePriorityFilter = useTaskStore((state) => state.activePriorityFilter)
  const activeDateRange = useTaskStore((state) => state.activeDateRange)
  const activeSortBy = useTaskStore((state) => state.activeSortBy)
  const isHydrated = useTaskStore((state) => state.isHydrated)
  const activeAction = useTaskStore((state) => state.activeAction)
  const feedback = useTaskStore((state) => state.feedback)
  const hydrateTasks = useTaskStore((state) => state.hydrateTasks)
  const setFilter = useTaskStore((state) => state.setFilter)
  const setGroupFilter = useTaskStore((state) => state.setGroupFilter)
  const setPriorityFilter = useTaskStore((state) => state.setPriorityFilter)
  const setDateRange = useTaskStore((state) => state.setDateRange)
  const setSortBy = useTaskStore((state) => state.setSortBy)
  const dismissFeedback = useTaskStore((state) => state.dismissFeedback)

  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false)
  const [activeConditionPanel, setActiveConditionPanel] = useState<ConditionPanel>('root')

  useEffect(() => {
    void hydrateTasks()
  }, [hydrateTasks])

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

  const totalCount = tasks.length
  const completedCount = tasks.filter((task) => task.completed).length
  const activeCount = totalCount - completedCount

  const filterCounts = {
    all: totalCount,
    active: activeCount,
    completed: completedCount,
  }

  const dynamicGroupOptions = useMemo(
    () =>
      taskGroups.map((group) => ({
        key: group.id,
        label: group.name,
        hint: group.description || '聚焦这一组中的任务',
      })),
    [taskGroups],
  )

  const activeGroupFilterLabel =
    activeGroupFilter === 'all-groups'
      ? '全部组'
      : activeGroupFilter === 'ungrouped'
        ? '未分组'
        : dynamicGroupOptions.find((group) => group.key === activeGroupFilter)?.label ?? '任务组'

  const activePriorityLabel =
    activePriorityFilter === 'all-priorities'
      ? '全部优先级'
      : TASK_PRIORITY_META[activePriorityFilter].label

  const activeDateRangeLabel = dateRangeLabel(activeDateRange)
  const activeSortLabel = sortLabel(activeSortBy)

  const hasExtraFilters =
    activeGroupFilter !== DEFAULT_TASK_QUERY.group ||
    activePriorityFilter !== DEFAULT_TASK_QUERY.priority ||
    activeDateRange !== DEFAULT_TASK_QUERY.dateRange ||
    activeSortBy !== DEFAULT_TASK_QUERY.sortBy

  const moreConditionsSummary = summarizeFilters(currentQuery, taskGroups)

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

  function openConditionPanel(panel: ConditionPanel) {
    setIsMoreFiltersOpen(true)
    setActiveConditionPanel(panel)
  }

  function countTasksWith(next: Partial<typeof currentQuery>) {
    return applyTaskQuery(tasks, { ...currentQuery, ...next }).length
  }

  function handleSelectGroupFilter(filter: TaskGroupFilter) {
    setGroupFilter(filter)
    setIsMoreFiltersOpen(false)
    setActiveConditionPanel('root')
  }

  function handleSelectPriorityFilter(filter: TaskPriorityFilter) {
    setPriorityFilter(filter)
    setIsMoreFiltersOpen(false)
    setActiveConditionPanel('root')
  }

  function handleSelectDateRange(filter: TaskDateRangeFilter) {
    setDateRange(filter)
    setIsMoreFiltersOpen(false)
    setActiveConditionPanel('root')
  }

  function handleSelectSort(sortBy: TaskSortBy) {
    setSortBy(sortBy)
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
                className={isMoreFiltersOpen || hasExtraFilters ? 'filter-button active' : 'filter-button'}
                onClick={handleToggleMoreFilters}
                type="button"
              >
                <span>更多条件</span>
                <small>收纳任务组、优先级、时间范围和排序方式</small>
                <strong>{moreConditionsSummary}</strong>
              </button>

              {isMoreFiltersOpen ? (
                <div className="nested-filter-panel">
                  {activeConditionPanel === 'root' ? (
                    <div className="nested-filter-list">
                      <button className="nested-filter-button" onClick={() => openConditionPanel('groups')} type="button">
                        <span>任务组</span>
                        <small>按任务归属进一步筛选清单</small>
                        <strong>{activeGroupFilterLabel}</strong>
                      </button>

                      <button className="nested-filter-button" onClick={() => openConditionPanel('priority')} type="button">
                        <span>优先级</span>
                        <small>按任务紧急程度筛选当前清单</small>
                        <strong>{activePriorityLabel}</strong>
                      </button>

                      <button className="nested-filter-button" onClick={() => openConditionPanel('date-range')} type="button">
                        <span>时间范围</span>
                        <small>按今天、未来 7 天、逾期或无日期聚焦</small>
                        <strong>{activeDateRangeLabel}</strong>
                      </button>

                      <button className="nested-filter-button" onClick={() => openConditionPanel('sort')} type="button">
                        <span>排序方式</span>
                        <small>切换默认推荐、截止日期、优先级或最近更新</small>
                        <strong>{activeSortLabel}</strong>
                      </button>
                    </div>
                  ) : null}

                  {activeConditionPanel === 'groups' ? (
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
                        <strong>{countTasksWith({ group: 'all-groups' })}</strong>
                      </button>

                      <button
                        className={activeGroupFilter === 'ungrouped' ? 'nested-filter-button active' : 'nested-filter-button'}
                        onClick={() => handleSelectGroupFilter('ungrouped')}
                        type="button"
                      >
                        <span>未分组</span>
                        <small>只看还未归组的任务</small>
                        <strong>{countTasksWith({ group: 'ungrouped' })}</strong>
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
                            <strong>{countTasksWith({ group: group.key })}</strong>
                          </button>
                        ))
                      ) : (
                        <div className="group-filter-empty">
                          <strong>还没有任务组</strong>
                          <p>可以从顶部的任务组管理里新建任务组。</p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {activeConditionPanel === 'priority' ? (
                    <div className="nested-filter-list">
                      <div className="nested-filter-toolbar">
                        <button className="nested-filter-back" onClick={() => setActiveConditionPanel('root')} type="button">
                          返回
                        </button>
                        <span>优先级</span>
                      </div>

                      {PRIORITY_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          className={activePriorityFilter === option.key ? 'nested-filter-button active' : 'nested-filter-button'}
                          onClick={() => handleSelectPriorityFilter(option.key)}
                          type="button"
                        >
                          <span>{option.label}</span>
                          <small>{option.hint}</small>
                          <strong>{countTasksWith({ priority: option.key })}</strong>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {activeConditionPanel === 'date-range' ? (
                    <div className="nested-filter-list">
                      <div className="nested-filter-toolbar">
                        <button className="nested-filter-back" onClick={() => setActiveConditionPanel('root')} type="button">
                          返回
                        </button>
                        <span>时间范围</span>
                      </div>

                      {DATE_RANGE_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          className={activeDateRange === option.key ? 'nested-filter-button active' : 'nested-filter-button'}
                          onClick={() => handleSelectDateRange(option.key)}
                          type="button"
                        >
                          <span>{option.label}</span>
                          <small>{option.hint}</small>
                          <strong>{countTasksWith({ dateRange: option.key })}</strong>
                        </button>
                      ))}
                    </div>
                  ) : null}

                  {activeConditionPanel === 'sort' ? (
                    <div className="nested-filter-list">
                      <div className="nested-filter-toolbar">
                        <button className="nested-filter-back" onClick={() => setActiveConditionPanel('root')} type="button">
                          返回
                        </button>
                        <span>排序方式</span>
                      </div>

                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.key}
                          className={activeSortBy === option.key ? 'nested-filter-button active' : 'nested-filter-button'}
                          onClick={() => handleSelectSort(option.key)}
                          type="button"
                        >
                          <span>{option.label}</span>
                          <small>{option.hint}</small>
                          <strong>{activeSortBy === option.key ? '当前' : option.shortLabel}</strong>
                        </button>
                      ))}
                    </div>
                  ) : null}
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
