/**
 * 文件说明：应用主界面，负责组织顶部主控制条、三仓式工作区、系统入口和任务列表。
 */
import { useEffect, useMemo, useState } from 'react'
import { BackupCenter } from '../components/BackupCenter'
import { GlobalTaskSearch } from '../components/GlobalTaskSearch'
import { TaskComposer } from '../components/TaskComposer'
import { TaskDetailDialog } from '../components/TaskDetailDialog'
import { TaskErrorDialog } from '../components/TaskErrorDialog'
import { TaskFeedbackToast } from '../components/TaskFeedbackToast'
import { TaskGroupManager } from '../components/TaskGroupManager'
import { TaskList } from '../components/TaskList'
import { TaskOverview } from '../components/TaskOverview'
import { TaskReminderCenter } from '../components/TaskReminderCenter'
import { TaskSettings } from '../components/TaskSettings'
import { DEFAULT_TASK_QUERY, applyTaskQuery, summarizeFilters } from '../features/tasks/task.filters'
import { TASK_PRIORITY_META } from '../features/tasks/task.priority'
import type { ReminderBuckets } from '../features/tasks/task.reminders'
import type {
  NotificationPermissionStatus,
  TaskDateRangeFilter,
  TaskFilter,
  TaskGroupFilter,
  TaskPriorityFilter,
  TaskSortBy,
} from '../features/tasks/task.types'
import { useTaskStore } from '../stores/taskStore'
import { useRecurringStore } from '../stores/recurringStore'

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
  { key: 'no-date', label: '无日期', hint: '只看尚未设置日期的任务' },
]

const SORT_OPTIONS: Array<{ key: TaskSortBy; label: string; hint: string; shortLabel: string }> = [
  { key: 'default', label: '默认推荐', hint: '保持时间语义与最近更新的综合排序', shortLabel: '推荐' },
  { key: 'due-date', label: '截止日期优先', hint: '更突出临近截止日期的任务', shortLabel: '到期' },
  { key: 'priority', label: '优先级优先', hint: '更突出紧急和高优先级任务', shortLabel: '优先级' },
  { key: 'updated', label: '最近更新', hint: '先看最近处理过的任务', shortLabel: '更新' },
]

const NOTIFICATION_STATUS_LABELS: Record<NotificationPermissionStatus, string> = {
  allowed: '通知权限正常',
  'not-requested': '尚未确认通知权限',
  denied: '通知权限未开启',
  error: '通知权限状态读取失败',
}

type ConditionPanel = 'root' | 'groups' | 'priority' | 'date-range' | 'sort'

function dateRangeLabel(dateRange: TaskDateRangeFilter) {
  return DATE_RANGE_OPTIONS.find((option) => option.key === dateRange)?.label ?? '全部时间'
}

function sortLabel(sortBy: TaskSortBy) {
  return SORT_OPTIONS.find((option) => option.key === sortBy)?.label ?? '默认推荐'
}

function buildReminderStripSummary(reminderCount: number, buckets: ReminderBuckets) {
  const fragments: string[] = []

  if (buckets.overdue.length > 0) {
    fragments.push(`${buckets.overdue.length} 条已逾期`)
  }

  if (buckets.upcoming.length > 0) {
    fragments.push(`${buckets.upcoming.length} 条即将到期`)
  }

  if (buckets.focusWithoutDate.length > 0) {
    fragments.push(`${buckets.focusWithoutDate.length} 条高优先级未排期`)
  }

  if (buckets.recentlyReminded.length > 0) {
    fragments.push(`${buckets.recentlyReminded.length} 条最近已提醒`)
  }

  return reminderCount > 0 ? fragments.join('，') : ''
}

export function AppShell() {
  const tasks = useTaskStore((state) => state.tasks)
  const filteredTasks = useTaskStore((state) => state.filteredTasks)
  const taskGroups = useTaskStore((state) => state.taskGroups)
  const activeFilter = useTaskStore((state) => state.activeFilter)
  const activeArchiveFilter = useTaskStore((state) => state.activeArchiveFilter)
  const activeGroupFilter = useTaskStore((state) => state.activeGroupFilter)
  const activePriorityFilter = useTaskStore((state) => state.activePriorityFilter)
  const activeDateRange = useTaskStore((state) => state.activeDateRange)
  const activeSortBy = useTaskStore((state) => state.activeSortBy)
  const activeAction = useTaskStore((state) => state.activeAction)
  const feedback = useTaskStore((state) => state.feedback)
  const reminderPreferences = useTaskStore((state) => state.reminderPreferences)
  const reminderBuckets = useTaskStore((state) => state.reminderBuckets)
  const notificationPermissionStatus = useTaskStore((state) => state.notificationPermissionStatus)
  const isBackupCenterOpen = useTaskStore((state) => state.isBackupCenterOpen)
  const lastBackupAt = useTaskStore((state) => state.lastBackupAt)
  const isSavingReminderPreferences = useTaskStore((state) => state.isSavingReminderPreferences)
  const hydrateTasks = useTaskStore((state) => state.hydrateTasks)
  const hydrateReminderPreferences = useTaskStore((state) => state.hydrateReminderPreferences)
  const saveReminderPreferences = useTaskStore((state) => state.saveReminderPreferences)
  const refreshNotificationPermissionStatus = useTaskStore((state) => state.refreshNotificationPermissionStatus)
  const sendTestDesktopNotification = useTaskStore((state) => state.sendTestDesktopNotification)
  const startReminderAutoRefresh = useTaskStore((state) => state.startReminderAutoRefresh)
  const stopReminderAutoRefresh = useTaskStore((state) => state.stopReminderAutoRefresh)
  const setFilter = useTaskStore((state) => state.setFilter)
  const setArchiveFilter = useTaskStore((state) => state.setArchiveFilter)
  const setGroupFilter = useTaskStore((state) => state.setGroupFilter)
  const setPriorityFilter = useTaskStore((state) => state.setPriorityFilter)
  const setDateRange = useTaskStore((state) => state.setDateRange)
  const setSortBy = useTaskStore((state) => state.setSortBy)
  const resetFilters = useTaskStore((state) => state.resetFilters)
  const dismissFeedback = useTaskStore((state) => state.dismissFeedback)
  const queueReminderNavigation = useTaskStore((state) => state.queueReminderNavigation)
  const editingTaskId = useTaskStore((state) => state.editingTaskId)
  const closeTaskDetail = useTaskStore((state) => state.closeTaskDetail)
  const updateTask = useTaskStore((state) => state.updateTask)
  const archiveTask = useTaskStore((state) => state.archiveTask)
  const setBackupCenterOpen = useTaskStore((state) => state.setBackupCenterOpen)
  const createBackup = useTaskStore((state) => state.createBackup)
  const restoreBackup = useTaskStore((state) => state.restoreBackup)
  const exportTasks = useTaskStore((state) => state.exportTasks)
  const searchKeyword = useTaskStore((state) => state.searchKeyword)
  const searchResults = useTaskStore((state) => state.searchResults)
  const setSearchKeyword = useTaskStore((state) => state.setSearchKeyword)
  const focusTaskFromSearch = useTaskStore((state) => state.focusTaskFromSearch)
  const hydrateRecurring = useRecurringStore((state) => state.hydrate)

  const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false)
  const [activeConditionPanel, setActiveConditionPanel] = useState<ConditionPanel>('root')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isReminderCenterOpen, setIsReminderCenterOpen] = useState(false)
  const [draftReminderPreferences, setDraftReminderPreferences] = useState(reminderPreferences)

  useEffect(() => {
    void hydrateTasks()
    void hydrateReminderPreferences()
    void hydrateRecurring()
    startReminderAutoRefresh()

    return () => {
      stopReminderAutoRefresh()
    }
  }, [hydrateRecurring, hydrateReminderPreferences, hydrateTasks, startReminderAutoRefresh, stopReminderAutoRefresh])

  useEffect(() => {
    if (!isSettingsOpen) {
      setDraftReminderPreferences(reminderPreferences)
    }
  }, [isSettingsOpen, reminderPreferences])

  const currentQuery = useMemo(
    () => ({
      status: activeFilter,
      archive: activeArchiveFilter,
      group: activeGroupFilter,
      priority: activePriorityFilter,
      dateRange: activeDateRange,
      sortBy: activeSortBy,
    }),
    [activeArchiveFilter, activeDateRange, activeFilter, activeGroupFilter, activePriorityFilter, activeSortBy],
  )

  const activeTasks = tasks.filter((task) => !task.archivedAt)
  const totalCount = activeTasks.length
  const completedCount = activeTasks.filter((task) => task.completed).length
  const activeCount = totalCount - completedCount
  const archivedCount = tasks.filter((task) => task.archivedAt).length

  const filterCounts = {
    all: totalCount,
    active: activeCount,
    completed: completedCount,
  }

  const sidebarCount = activeArchiveFilter === 'archived' ? archivedCount : filterCounts[activeFilter]

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
      ? '全部任务组'
      : activeGroupFilter === 'ungrouped'
        ? '未分组'
        : dynamicGroupOptions.find((group) => group.key === activeGroupFilter)?.label ?? '任务组'

  const activePriorityLabel =
    activePriorityFilter === 'all-priorities' ? '全部优先级' : TASK_PRIORITY_META[activePriorityFilter].label

  const activeDateRangeLabel = dateRangeLabel(activeDateRange)
  const activeSortLabel = sortLabel(activeSortBy)

  const hasExtraFilters =
    activeGroupFilter !== DEFAULT_TASK_QUERY.group ||
    activePriorityFilter !== DEFAULT_TASK_QUERY.priority ||
    activeDateRange !== DEFAULT_TASK_QUERY.dateRange ||
    activeSortBy !== DEFAULT_TASK_QUERY.sortBy

  const moreConditionsSummary = summarizeFilters(currentQuery, taskGroups)

  const statusNotice =
    activeAction === 'hydrate' ? { tone: 'info' as const, message: '正在读取本地任务数据...' } : feedback

  const pendingReminderBuckets = {
    ...reminderBuckets,
    recentlyReminded: [],
  }

  const reminderCount =
    pendingReminderBuckets.overdue.length +
    pendingReminderBuckets.upcoming.length +
    pendingReminderBuckets.focusWithoutDate.length

  const reminderStripSummary = buildReminderStripSummary(reminderCount, pendingReminderBuckets)
  const editingTask = tasks.find((task) => task.id === editingTaskId) ?? null

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

  function handleSelectStatusFilter(filter: TaskFilter) {
    setArchiveFilter('active')
    setFilter(filter)
  }

  function handleSelectArchiveFilter() {
    setFilter('all')
    setArchiveFilter('archived')
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

  async function handleSaveReminderPreferences() {
    const isSaved = await saveReminderPreferences(draftReminderPreferences)

    if (isSaved) {
      setIsSettingsOpen(false)
    }
  }

  return (
    <main className="app-shell app-shell-console theme-coldsteel">
      <section className="console-header console-header-allows-overflow panel-surface panel-strong">
        <div className="brand-block">
          <span className="brand-mark" aria-hidden="true">
            QD
          </span>
          <div>
            <p className="eyebrow">轻单 Qingdan</p>
            <h1>桌面任务指挥台</h1>
          </div>
        </div>

        <div className="console-header-main">
          <GlobalTaskSearch
            keyword={searchKeyword}
            onKeywordChange={setSearchKeyword}
            onSelect={(taskId) => void focusTaskFromSearch(taskId)}
            results={searchResults}
          />

          <div className="console-primary-actions">
            <TaskOverview />
            <TaskGroupManager />
            <TaskComposer />
          </div>
        </div>

        <div className="system-action-bar" aria-label="系统入口" role="group">
          <BackupCenter
            isOpen={isBackupCenterOpen}
            lastBackupAt={lastBackupAt}
            onBackupNow={createBackup}
            onExportCsv={(exportPath) => exportTasks(exportPath, 'csv')}
            onExportJson={(exportPath) => exportTasks(exportPath, 'json')}
            onOpenChange={setBackupCenterOpen}
            onRestoreFromBackup={restoreBackup}
          />

          <TaskReminderCenter
            buckets={reminderBuckets}
            isOpen={isReminderCenterOpen}
            onOpenChange={setIsReminderCenterOpen}
            onSelectTask={(taskId) => {
              if (!filteredTasks.some((task) => task.id === taskId)) {
                resetFilters()
              }
              queueReminderNavigation(taskId)
              setIsReminderCenterOpen(false)
            }}
          />

          <TaskSettings
            isOpen={isSettingsOpen}
            isSaving={isSavingReminderPreferences}
            notificationPermissionStatus={notificationPermissionStatus}
            onOpenChange={setIsSettingsOpen}
            onPreferencesChange={setDraftReminderPreferences}
            onRefreshNotificationPermissionStatus={refreshNotificationPermissionStatus}
            onSave={handleSaveReminderPreferences}
            onSendTestDesktopNotification={sendTestDesktopNotification}
            preferences={draftReminderPreferences}
          />
        </div>
      </section>

      <section aria-label="工作区布局" className="workspace-panel workspace-panel-console">
        <aside aria-label="导航矩阵" className="sidebar-stack console-rail">
          <section className="sidebar-card panel-surface console-panel">
            <div className="sidebar-heading">
              <div>
                <p className="section-tag">导航矩阵</p>
                <h2>工作视图</h2>
              </div>
              <span className="sidebar-count">{sidebarCount}</span>
            </div>

            <div className="filter-list">
              {FILTER_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  className={option.key === activeFilter && activeArchiveFilter === 'active' ? 'filter-button active' : 'filter-button'}
                  onClick={() => handleSelectStatusFilter(option.key)}
                  type="button"
                >
                  <span>{option.label}</span>
                  <small>{option.hint}</small>
                  <strong>{filterCounts[option.key]}</strong>
                </button>
              ))}

              <button
                className={activeArchiveFilter === 'archived' ? 'filter-button active' : 'filter-button'}
                onClick={handleSelectArchiveFilter}
                type="button"
              >
                <span>归档</span>
                <small>查看已经收纳归档的任务</small>
                <strong>{archivedCount}</strong>
              </button>

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

                      <div className="nested-filter-footer">
                        <button
                          className="secondary-button"
                          disabled={!hasExtraFilters && activeFilter === DEFAULT_TASK_QUERY.status}
                          onClick={resetFilters}
                          type="button"
                        >
                          恢复默认筛选
                        </button>
                      </div>
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
                        <span>全部任务组</span>
                        <small>不过滤任务归属</small>
                        <strong>{countTasksWith({ group: 'all-groups' })}</strong>
                      </button>

                      <button
                        className={activeGroupFilter === 'ungrouped' ? 'nested-filter-button active' : 'nested-filter-button'}
                        onClick={() => handleSelectGroupFilter('ungrouped')}
                        type="button"
                      >
                        <span>未分组</span>
                        <small>只看尚未归组的任务</small>
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

        <section aria-label="任务主战场" className="content-column">
          <div className="content-card panel-surface console-panel console-board">
            {statusNotice ? (
              <div className={`status-banner ${statusNotice.tone}`}>
                <p>{statusNotice.message}</p>
                {feedback ? (
                  <button className="secondary-button" onClick={dismissFeedback} type="button">
                    知道了
                  </button>
                ) : null}
              </div>
            ) : null}

            <TaskList />
          </div>
        </section>

        <aside aria-label="系统仓" className="console-system-bay">
          <section className="sidebar-card panel-surface console-panel">
            <div className="sidebar-heading">
              <div>
                <p className="section-tag">系统仓</p>
                <h2>提醒 / 备份 / 状态</h2>
              </div>
              <span className="sidebar-count">{reminderCount}</span>
            </div>

            <div className="system-bay-grid">
              <article className="system-bay-card">
                <div className="system-bay-card-header">
                  <strong>提醒</strong>
                  <span className="task-console-chip is-reminder-state is-upcoming">{reminderCount}</span>
                </div>
                <p>{reminderCount > 0 ? reminderStripSummary : '当前没有待关注事项。'}</p>
                <button className="secondary-button" onClick={() => setIsReminderCenterOpen(true)} type="button">
                  查看提醒中心
                </button>
              </article>

              <article className="system-bay-card">
                <div className="system-bay-card-header">
                  <strong>备份</strong>
                  <span className="task-console-chip is-meta">{lastBackupAt ? '已记录' : '未备份'}</span>
                </div>
                <p>{lastBackupAt ? `最近备份已记录，可进入备份中心继续管理。` : '尚未创建备份，建议先建立本地快照。'}</p>
                <button className="secondary-button" onClick={() => setBackupCenterOpen(true)} type="button">
                  打开备份中心
                </button>
              </article>

              <article className="system-bay-card">
                <div className="system-bay-card-header">
                  <strong>系统状态</strong>
                  <span className="task-console-chip is-meta">{notificationPermissionStatus === 'allowed' ? '在线' : '需关注'}</span>
                </div>
                <dl className="system-status-list">
                  <div>
                    <dt>通知权限</dt>
                    <dd>{NOTIFICATION_STATUS_LABELS[notificationPermissionStatus]}</dd>
                  </div>
                  <div>
                    <dt>工作台任务</dt>
                    <dd>{tasks.length} 条</dd>
                  </div>
                  <div>
                    <dt>当前筛选结果</dt>
                    <dd>{filteredTasks.length} 条</dd>
                  </div>
                </dl>
              </article>
            </div>
          </section>
        </aside>
      </section>

      <TaskFeedbackToast />
      <TaskErrorDialog />
      <TaskDetailDialog
        isOpen={Boolean(editingTask)}
        task={editingTask}
        tasks={tasks}
        taskGroups={taskGroups}
        isMutating={activeAction === 'update' || activeAction === 'bulk'}
        onClose={closeTaskDetail}
        onSave={updateTask}
        onArchive={archiveTask}
      />
    </main>
  )
}
