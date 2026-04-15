# v0.30.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `v0.20.0` 基线上完成 `v0.30.0` 的筛选恢复默认、低侵入反馈重构和全局提醒系统，并保持当前工作台结构稳定。

**Architecture:** 前端继续以 `taskStore + AppShell + TaskList` 为核心，新增独立的提醒偏好、提醒派生和轻提示/错误弹窗状态，不把新语义散落到现有组件里。提醒配置采用独立偏好存储，运行时桌面通知只在应用运行中触发；点击提醒后通过统一定位状态把用户带回对应任务。

**Tech Stack:** React 19、TypeScript、Zustand、Vitest、Tauri 2、Rust、SQLite、Tauri Notification Plugin

---

## File Map

### Frontend files

- Modify: `src/features/tasks/task.types.ts`
  - 增加提醒偏好、提醒项、轻提示和错误弹窗相关类型。
- Modify: `src/features/tasks/task.storage.ts`
  - 增加提醒偏好读取/保存访问层，保持浏览器回退可用。
- Modify: `src/features/tasks/task.filters.ts`
  - 暴露恢复默认筛选需要的统一默认查询口径。
- Create: `src/features/tasks/task.reminders.ts`
  - 负责根据任务列表和提醒偏好派生关注条与提醒弹窗数据。
- Create: `src/features/tasks/task.reminders.test.ts`
  - 覆盖即将到期、逾期、高优先级无日期和门槛筛选口径。
- Create: `src/components/TaskFeedbackToast.tsx`
  - 右下角成功轻提示。
- Create: `src/components/TaskErrorDialog.tsx`
  - 统一失败弹窗。
- Create: `src/components/TaskSettings.tsx`
  - 右上角设置弹窗，承接提醒偏好设置。
- Create: `src/components/TaskReminderCenter.tsx`
  - 右上角铃铛入口与提醒弹窗。
- Modify: `src/app/AppShell.tsx`
  - 接入设置入口、铃铛入口、关注条、恢复默认筛选入口和全局反馈组件。
- Modify: `src/components/TaskList.tsx`
  - 处理提醒定位后的任务高亮，移除列表区操作结果反馈。
- Modify: `src/stores/taskStore.ts`
  - 状态中心升级：恢复默认筛选、成功提示、错误弹窗、提醒偏好、提醒弹窗、任务定位。
- Modify: `src/index.css`
  - 补设置入口、关注条、铃铛、提醒弹窗、轻提示、错误弹窗、高亮态样式。

### Tauri / backend files

- Modify: `package.json`
  - 增加 `@tauri-apps/plugin-notification` 前端依赖。
- Modify: `src-tauri/Cargo.toml`
  - 增加 `tauri-plugin-notification` Rust 依赖。
- Modify: `src-tauri/src/lib.rs`
  - 注册通知插件。

### Docs and acceptance

- Modify: `docs/ARCHITECTURE.md`
  - 增加 `v0.30.0` 当前实施基线。
- Create: `docs/V030_ACCEPTANCE.md`
  - 新版验收基线。
- Modify: `docs/WORKLOG.md`
  - 逐轮记录 `v0.30.0` 落地过程。

## Task 1: 补齐提醒类型、偏好存储和恢复默认查询基础

**Files:**
- Modify: `src/features/tasks/task.types.ts`
- Modify: `src/features/tasks/task.storage.ts`
- Modify: `src/features/tasks/task.filters.ts`
- Test: `src/features/tasks/task.reminders.test.ts`

- [ ] **Step 1: 为提醒偏好和关注项写失败测试**

```ts
import { describe, expect, it } from 'vitest'
import { DEFAULT_REMINDER_PREFERENCES, deriveReminderBuckets } from './task.reminders'
import type { TaskItem } from './task.types'

function buildTask(overrides: Partial<TaskItem>): TaskItem {
  return {
    id: 'task-1',
    title: '准备周报',
    description: '',
    completed: false,
    groupId: null,
    dueAt: null,
    priority: 'high',
    createdAt: '2026-04-16T08:00:00.000Z',
    updatedAt: '2026-04-16T08:00:00.000Z',
    ...overrides,
  }
}

describe('deriveReminderBuckets', () => {
  it('includes overdue and undated high-priority tasks in app reminders', () => {
    const tasks = [
      buildTask({ id: 'overdue', dueAt: '2026-04-15T07:00:00.000Z', priority: 'urgent' }),
      buildTask({ id: 'focus', dueAt: null, priority: 'high' }),
    ]

    const result = deriveReminderBuckets(tasks, DEFAULT_REMINDER_PREFERENCES, '2026-04-16T08:30:00.000Z')

    expect(result.overdue.map((item) => item.task.id)).toEqual(['overdue'])
    expect(result.focusWithoutDate.map((item) => item.task.id)).toEqual(['focus'])
  })
})
```

- [ ] **Step 2: 运行测试确认当前缺少提醒模块**

Run: `cmd /c npx.cmd vitest run src/features/tasks/task.reminders.test.ts`

Expected: FAIL，提示 `task.reminders.ts` 不存在或 `deriveReminderBuckets` 未定义

- [ ] **Step 3: 在类型文件中增加提醒偏好和提醒项定义**

```ts
export type ReminderPriorityThreshold = 'urgent' | 'high' | 'medium'

export type ReminderOffsetPreset = 'at-time' | '10-minutes' | '1-hour' | '1-day' | 'custom'

export interface ReminderPreferences {
  enableInApp: boolean
  enableDesktop: boolean
  priorityThreshold: ReminderPriorityThreshold
  offsetPreset: ReminderOffsetPreset
  customOffsetMinutes: number
}

export interface ReminderItem {
  task: TaskItem
  reason: 'upcoming' | 'overdue' | 'focus-without-date' | 'recently-reminded'
  dueLabel: string
}
```

- [ ] **Step 4: 在筛选工具模块中暴露统一重置口径**

```ts
export const DEFAULT_TASK_QUERY: TaskQueryInput = {
  status: 'all',
  group: 'all-groups',
  priority: 'all-priorities',
  dateRange: 'all-time',
  sortBy: 'default',
}

export function resetTaskQuery(): TaskQueryInput {
  return { ...DEFAULT_TASK_QUERY }
}
```

- [ ] **Step 5: 在数据访问层中增加提醒偏好读写**

```ts
const REMINDER_PREFERENCES_STORAGE_KEY = 'qingdan.reminder-preferences'

const reminderPreferencesSchema = z.object({
  enableInApp: z.boolean(),
  enableDesktop: z.boolean(),
  priorityThreshold: z.enum(['urgent', 'high', 'medium']).catch('high'),
  offsetPreset: z.enum(['at-time', '10-minutes', '1-hour', '1-day', 'custom']).catch('1-hour'),
  customOffsetMinutes: z.number().int().nonnegative().catch(120),
})

export async function loadReminderPreferences(): Promise<ReminderPreferences> {
  const rawValue = window.localStorage.getItem(REMINDER_PREFERENCES_STORAGE_KEY)
  if (!rawValue) {
    return DEFAULT_REMINDER_PREFERENCES
  }

  const parsed = reminderPreferencesSchema.safeParse(JSON.parse(rawValue))
  return parsed.success ? parsed.data : DEFAULT_REMINDER_PREFERENCES
}

export async function saveReminderPreferences(input: ReminderPreferences): Promise<ReminderPreferences> {
  window.localStorage.setItem(REMINDER_PREFERENCES_STORAGE_KEY, JSON.stringify(input))
  return input
}
```

- [ ] **Step 6: 创建提醒派生模块最小实现**

```ts
import dayjs from 'dayjs'
import type { ReminderItem, ReminderPreferences, TaskItem } from './task.types'

export const DEFAULT_REMINDER_PREFERENCES: ReminderPreferences = {
  enableInApp: true,
  enableDesktop: false,
  priorityThreshold: 'high',
  offsetPreset: '1-hour',
  customOffsetMinutes: 120,
}

function reachesThreshold(task: TaskItem, threshold: ReminderPreferences['priorityThreshold']) {
  const weights = { urgent: 4, high: 3, medium: 2, low: 1 }
  return weights[task.priority] >= weights[threshold]
}

export function deriveReminderBuckets(tasks: TaskItem[], preferences: ReminderPreferences, nowIso: string) {
  const now = dayjs(nowIso)

  const overdue: ReminderItem[] = []
  const focusWithoutDate: ReminderItem[] = []

  for (const task of tasks) {
    if (task.completed) {
      continue
    }

    if (!task.dueAt && reachesThreshold(task, 'high')) {
      focusWithoutDate.push({ task, reason: 'focus-without-date', dueLabel: '未设置日期' })
      continue
    }

    if (task.dueAt && dayjs(task.dueAt).isBefore(now) && reachesThreshold(task, preferences.priorityThreshold)) {
      overdue.push({ task, reason: 'overdue', dueLabel: '已逾期' })
    }
  }

  return {
    overdue,
    upcoming: [] as ReminderItem[],
    focusWithoutDate,
    recentlyReminded: [] as ReminderItem[],
  }
}
```

- [ ] **Step 7: 运行提醒派生测试**

Run: `cmd /c npx.cmd vitest run src/features/tasks/task.reminders.test.ts`

Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add src/features/tasks/task.types.ts src/features/tasks/task.storage.ts src/features/tasks/task.filters.ts src/features/tasks/task.reminders.ts src/features/tasks/task.reminders.test.ts
git commit -m "feat: add reminder preference foundation"
```

## Task 2: 重构 taskStore，接入恢复默认筛选、轻提示和错误弹窗

**Files:**
- Modify: `src/stores/taskStore.ts`
- Test: `src/features/tasks/task.reminders.test.ts`

- [ ] **Step 1: 给状态中心写恢复默认和反馈状态测试**

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useTaskStore } from '../../stores/taskStore'

describe('taskStore reset and feedback', () => {
  beforeEach(() => {
    useTaskStore.setState(useTaskStore.getInitialState(), true)
  })

  it('resets filters back to default query', () => {
    useTaskStore.getState().setFilter('completed')
    useTaskStore.getState().setPriorityFilter('urgent')
    useTaskStore.getState().resetFilters()

    const state = useTaskStore.getState()
    expect(state.activeFilter).toBe('all')
    expect(state.activePriorityFilter).toBe('all-priorities')
    expect(state.activeSortBy).toBe('default')
  })

  it('stores success toast without inline error banner state', async () => {
    const dismiss = vi.fn()
    useTaskStore.setState({
      toast: { message: '已新建任务', visible: true },
      dismissToast: dismiss,
    } as never)

    expect(useTaskStore.getState().toast?.message).toBe('已新建任务')
  })
})
```

- [ ] **Step 2: 运行测试确认 store 还没有这些状态**

Run: `cmd /c npx.cmd vitest run src/features/tasks/task.reminders.test.ts`

Expected: FAIL，提示 `resetFilters`、`toast` 或 `getInitialState` 不存在

- [ ] **Step 3: 在 store 中新增状态结构**

```ts
interface TaskToast {
  message: string
  visible: boolean
}

interface TaskErrorDialogState {
  title: string
  message: string
}

interface TaskReminderNavigation {
  taskId: string
  requestedAt: number
}
```

- [ ] **Step 4: 增加恢复默认筛选方法**

```ts
resetFilters: () =>
  set((state) => ({
    activeFilter: DEFAULT_TASK_QUERY.status,
    activeGroupFilter: DEFAULT_TASK_QUERY.group,
    activePriorityFilter: DEFAULT_TASK_QUERY.priority,
    activeDateRange: DEFAULT_TASK_QUERY.dateRange,
    activeSortBy: DEFAULT_TASK_QUERY.sortBy,
    filteredTasks: buildVisibleTasks(state.tasks, DEFAULT_TASK_QUERY),
  })),
```

- [ ] **Step 5: 把原 feedback 一分为二**

```ts
showSuccessToast(message: string) {
  set({ toast: { message, visible: true } })
}

showErrorDialog(message: string) {
  set({
    errorDialog: {
      title: '操作失败',
      message,
    },
  })
}
```

- [ ] **Step 6: 把各个异步动作从列表区反馈切换到新结构**

```ts
set((state) => ({
  tasks,
  filteredTasks: buildVisibleTasks(tasks, buildQuery(state)),
  activeAction: null,
  toast: {
    message: '已更新优先级',
    visible: true,
  },
  errorDialog: null,
}))
```

- [ ] **Step 7: 保留删除逻辑不改，只改反馈出口**

```ts
// 保持 removeTask / removeTaskGroup 的数据语义不变，只替换成功和失败的展示方式
catch (error) {
  set({
    activeAction: null,
    errorDialog: {
      title: '操作失败',
      message: getErrorMessage(error, '删除任务失败，请稍后再试。'),
    },
  })
}
```

- [ ] **Step 8: 运行前端测试**

Run: `cmd /c npx.cmd vitest run`

Expected: PASS

- [ ] **Step 9: 提交**

```bash
git add src/stores/taskStore.ts src/features/tasks/task.reminders.test.ts
git commit -m "refactor: split task feedback state"
```

## Task 3: 落设置弹窗、铃铛提醒中心、关注条和恢复默认筛选入口

**Files:**
- Create: `src/components/TaskFeedbackToast.tsx`
- Create: `src/components/TaskErrorDialog.tsx`
- Create: `src/components/TaskSettings.tsx`
- Create: `src/components/TaskReminderCenter.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: 为设置弹窗和提醒弹窗写最小渲染测试**

```ts
import { render, screen } from '@testing-library/react'
import { TaskSettings } from './TaskSettings'
import { TaskReminderCenter } from './TaskReminderCenter'

it('renders reminder threshold options inside settings dialog', () => {
  render(<TaskSettings />)
  expect(screen.getByText('提醒设置')).toBeInTheDocument()
  expect(screen.getByText('高及以上')).toBeInTheDocument()
})

it('renders reminder groups when dialog is open', () => {
  render(<TaskReminderCenter />)
  expect(screen.getByText('提醒中心')).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试确认组件缺失**

Run: `cmd /c npx.cmd vitest run src/components/TaskSettings.test.tsx src/components/TaskReminderCenter.test.tsx`

Expected: FAIL，提示组件文件不存在

- [ ] **Step 3: 创建成功轻提示组件**

```tsx
export function TaskFeedbackToast() {
  const toast = useTaskStore((state) => state.toast)
  const dismissToast = useTaskStore((state) => state.dismissToast)

  useEffect(() => {
    if (!toast?.visible) {
      return
    }

    const timer = window.setTimeout(() => dismissToast(), 2400)
    return () => window.clearTimeout(timer)
  }, [dismissToast, toast])

  if (!toast?.visible) {
    return null
  }

  return <div className="task-toast">{toast.message}</div>
}
```

- [ ] **Step 4: 创建统一错误弹窗**

```tsx
export function TaskErrorDialog() {
  const errorDialog = useTaskStore((state) => state.errorDialog)
  const closeErrorDialog = useTaskStore((state) => state.closeErrorDialog)

  if (!errorDialog) {
    return null
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section className="dialog-panel" role="dialog" aria-modal="true" aria-labelledby="task-error-title">
        <h2 id="task-error-title">{errorDialog.title}</h2>
        <p>{errorDialog.message}</p>
        <button type="button" onClick={closeErrorDialog}>
          关闭
        </button>
      </section>
    </div>
  )
}
```

- [ ] **Step 5: 创建设置弹窗**

```tsx
export function TaskSettings() {
  const preferences = useTaskStore((state) => state.reminderPreferences)
  const savePreferences = useTaskStore((state) => state.saveReminderPreferences)

  return (
    <button type="button" className="icon-button">
      设置
      <div className="settings-dialog">
        <h2>提醒设置</h2>
        <label>
          <span>提醒优先级门槛</span>
          <select
            value={preferences.priorityThreshold}
            onChange={(event) => void savePreferences({ ...preferences, priorityThreshold: event.target.value as 'urgent' | 'high' | 'medium' })}
          >
            <option value="urgent">紧急及以上</option>
            <option value="high">高及以上</option>
            <option value="medium">中及以上</option>
          </select>
        </label>
      </div>
    </button>
  )
}
```

- [ ] **Step 6: 创建铃铛提醒弹窗**

```tsx
export function TaskReminderCenter() {
  const reminderBuckets = useTaskStore((state) => state.reminderBuckets)
  const openReminderTarget = useTaskStore((state) => state.openReminderTarget)

  return (
    <section className="reminder-center">
      <button type="button" className="icon-button">
        铃铛
      </button>
      <div className="reminder-dialog" role="dialog" aria-label="提醒中心">
        <h2>提醒中心</h2>
        {reminderBuckets.overdue.map((item) => (
          <button key={item.task.id} type="button" onClick={() => openReminderTarget(item.task.id)}>
            <strong>{item.task.title}</strong>
            <span>{item.dueLabel}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 7: 在 AppShell 中接入新入口和恢复默认筛选**

```tsx
<div className="topbar-actions">
  <TaskOverview />
  <TaskSettings />
  <TaskReminderCenter />
  <TaskGroupManager />
  <TaskComposer />
</div>

{activeConditionPanel === 'root' ? (
  <div className="nested-filter-footer">
    <button
      className="secondary-button"
      type="button"
      onClick={resetFilters}
      disabled={!hasExtraFilters && activeFilter === DEFAULT_TASK_QUERY.status}
    >
      恢复默认筛选
    </button>
  </div>
) : null}

<TaskFeedbackToast />
<TaskErrorDialog />
```

- [ ] **Step 8: 在样式中补新组件状态**

```css
.task-toast {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 40;
}

.reminder-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.task-row.reminder-target {
  animation: reminder-target-pulse 1.8s ease;
}
```

- [ ] **Step 9: 运行类型检查和前端测试**

Run: `cmd /c node_modules\\.bin\\tsc.cmd -b`

Expected: PASS

Run: `cmd /c npx.cmd vitest run`

Expected: PASS

- [ ] **Step 10: 提交**

```bash
git add src/app/AppShell.tsx src/components/TaskFeedbackToast.tsx src/components/TaskErrorDialog.tsx src/components/TaskSettings.tsx src/components/TaskReminderCenter.tsx src/index.css
git commit -m "feat: add reminder center and feedback ui"
```

## Task 4: 接入运行时桌面通知和提醒定位闭环

**Files:**
- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src/stores/taskStore.ts`
- Modify: `src/components/TaskList.tsx`
- Modify: `src/features/tasks/task.reminders.ts`

- [ ] **Step 1: 为提醒定位写失败测试**

```ts
import { render, screen } from '@testing-library/react'
import { TaskList } from './TaskList'
import { useTaskStore } from '../stores/taskStore'

it('highlights the requested task after reminder navigation', () => {
  useTaskStore.setState({
    reminderNavigation: { taskId: 'task-2', requestedAt: Date.now() },
  } as never)

  render(<TaskList />)
  expect(screen.getByTestId('task-row-task-2')).toHaveClass('reminder-target')
})
```

- [ ] **Step 2: 运行测试确认还没有 reminder target 状态**

Run: `cmd /c npx.cmd vitest run src/components/TaskList.test.tsx`

Expected: FAIL，提示 `reminder-target` 或 `data-testid` 未出现

- [ ] **Step 3: 增加通知插件依赖**

```json
"dependencies": {
  "@tauri-apps/api": "^2.10.1",
  "@tauri-apps/plugin-notification": "^2.0.0",
  "@tauri-apps/plugin-sql": "^2.4.0"
}
```

```toml
tauri-plugin-notification = "2"
```

- [ ] **Step 4: 在 Tauri 入口注册通知插件**

```rust
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::system::ping,
            commands::tasks::list_tasks,
            commands::tasks::query_tasks,
        ])
```

- [ ] **Step 5: 在 store 中增加运行时提醒检查**

```ts
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'

async function emitDesktopReminder(task: TaskItem) {
  let permissionGranted = await isPermissionGranted()
  if (!permissionGranted) {
    const permission = await requestPermission()
    permissionGranted = permission === 'granted'
  }

  if (!permissionGranted) {
    return
  }

  await sendNotification({
    title: '轻单提醒',
    body: `${task.title} 即将到期`,
  })
}
```

- [ ] **Step 6: 只对满足门槛且有截止日期的任务发通知**

```ts
if (preferences.enableDesktop) {
  for (const item of reminderBuckets.upcoming) {
    if (!state.sentReminderIds.includes(item.task.id)) {
      void emitDesktopReminder(item.task)
    }
  }
}
```

- [ ] **Step 7: 在 TaskList 中实现滚动定位和短暂高亮**

```tsx
useEffect(() => {
  if (!reminderNavigation) {
    return
  }

  const element = document.querySelector<HTMLElement>(`[data-task-id="${reminderNavigation.taskId}"]`)
  element?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  window.setTimeout(() => clearReminderNavigation(), 1800)
}, [clearReminderNavigation, reminderNavigation])
```

- [ ] **Step 8: 为任务行加定位属性和高亮 class**

```tsx
<article
  data-testid={`task-row-${task.id}`}
  data-task-id={task.id}
  className={task.id === reminderNavigation?.taskId ? 'task-row reminder-target' : 'task-row'}
>
```

- [ ] **Step 9: 运行完整验证**

Run: `cmd /c npm.cmd install`

Expected: PASS，新增通知插件依赖成功

Run: `cmd /c npx.cmd vitest run`

Expected: PASS

Run: `cmd /c node_modules\\.bin\\tsc.cmd -b`

Expected: PASS

Run: `cargo check`

Expected: PASS

- [ ] **Step 10: 提交**

```bash
git add package.json package-lock.json src-tauri/Cargo.toml src-tauri/Cargo.lock src-tauri/src/lib.rs src/stores/taskStore.ts src/components/TaskList.tsx src/features/tasks/task.reminders.ts
git commit -m "feat: add runtime reminder notifications"
```

## Task 5: 文档、验收和发布收口

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Create: `docs/V030_ACCEPTANCE.md`
- Modify: `docs/WORKLOG.md`

- [ ] **Step 1: 更新架构文档**

```md
## `v0.30.0` 当前实施基线

- `更多条件` 面板内部新增 `恢复默认筛选`
- 成功反馈改为右下角轻提示，失败反馈改为统一错误弹窗
- 右上角新增 `设置` 与 `铃铛` 入口
- 提醒系统采用全局规则：优先级门槛 + 提醒时间
- 点击提醒项后可定位并高亮对应任务
```

- [ ] **Step 2: 新建验收文档**

```md
# `v0.30.0` 验收清单

## 1. 筛选恢复默认
- [ ] 展开 `更多条件` 后能看到 `恢复默认筛选`
- [ ] 点击后主筛选、附加筛选和分页全部回到默认

## 2. 反馈机制
- [ ] 成功操作不再占用列表区
- [ ] 成功操作显示右下角轻提示
- [ ] 失败操作显示统一错误弹窗

## 3. 提醒系统
- [ ] 设置弹窗可配置提醒门槛和提醒时间
- [ ] 铃铛弹窗可查看提醒分组
- [ ] 点击提醒项后可定位到任务
```

- [ ] **Step 3: 追加工作日志**

```md
## 2026-04-16 第 1 轮

- 正式进入 `v0.30.0` 实施，优先落筛选恢复默认、反馈机制重构和全局提醒系统。
- 当前版本不做每任务单独提醒，不做重复提醒，不改删除行为。
```

- [ ] **Step 4: 运行收口验证**

Run: `cmd /c npx.cmd vitest run`

Expected: PASS

Run: `cmd /c node_modules\\.bin\\tsc.cmd -b`

Expected: PASS

Run: `cargo check`

Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add docs/ARCHITECTURE.md docs/V030_ACCEPTANCE.md docs/WORKLOG.md
git commit -m "docs: add v0.30.0 acceptance baseline"
```

## Spec Coverage Check

- `恢复默认筛选`：Task 2、Task 3、Task 5 覆盖。
- 成功轻提示与失败弹窗：Task 2、Task 3 覆盖。
- 全局提醒偏好与门槛：Task 1、Task 3、Task 4 覆盖。
- 首页关注条与铃铛提醒弹窗：Task 3 覆盖。
- 提醒到任务定位闭环：Task 4 覆盖。
- 文档与验收：Task 5 覆盖。

## Execution Notes

- 不改删除相关数据语义，只替换删除成功/失败的反馈出口。
- 系统通知范围限定为“应用运行时的桌面通知”，不做后台守护。
- 若通知插件需要额外 capability 配置，先以最小权限补齐，再执行 `cargo check` 和前端验证。
