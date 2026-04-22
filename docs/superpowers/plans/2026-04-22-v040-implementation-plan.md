# v0.40.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成 `v0.40.0` 的提醒系统收口、完成复盘增强、任务详情与整理轻量增强。

**Architecture:** 先扩展 SQLite/Rust/TypeScript 任务模型，再接入 store 与查询语义，最后落详情弹窗、归档视图、复盘统计和通知权限/测试通知。保持现有 `taskStore + AppShell + TaskList + TaskOverview + TaskSettings` 架构，不重做主工作台。

**Tech Stack:** Tauri 2, Rust, SQLite/rusqlite, React 19, TypeScript, Zustand, Vitest, Tauri notification plugin.

---

## File Map

- `src-tauri/src/db/mod.rs`, `src-tauri/src/db/tests.rs`: `note / completed_at / archived_at` 迁移、索引和兼容测试。
- `src-tauri/src/models/mod.rs`, `src-tauri/src/commands/tasks.rs`: 任务模型、查询默认排除归档、完成时间、归档和批量归档。
- `src/features/tasks/task.types.ts`, `task.storage.ts`, `task.filters.ts`: 前端类型、本地 fallback、Tauri payload、归档筛选。
- `src/features/tasks/task.quality.ts`: 低质量标题、重复标题、高优先级无备注检测。
- `src/features/tasks/task.overview.ts`: 最近完成、本周复盘、月度趋势、质量提示。
- `src/stores/taskStore.ts`: 详情编辑状态、归档动作、批量归档、通知权限状态、测试通知。
- `src/components/TaskDetailDialog.tsx`: 任务详情弹窗。
- `src/components/TaskList.tsx`, `TaskOverview.tsx`, `TaskSettings.tsx`, `src/app/AppShell.tsx`: 归档入口、详情入口、复盘展示、通知设置收口。
- `docs/V040_ACCEPTANCE.md`, `docs/ARCHITECTURE.md`, `docs/WORKLOG.md`: 文档基线。

## Task 1: 文档基线和验收清单

**Files:**
- Create: `docs/V040_ACCEPTANCE.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/WORKLOG.md`

- [ ] **Step 1: Create `docs/V040_ACCEPTANCE.md`**

Use this structure:

```markdown
# `v0.40.0` 验收清单

## 说明

本清单是 `v0.40.0` 当前唯一有效的手工验收基线。

## 验收项

### 1. 提醒系统收口

- 设置弹窗不再显示“仅保留偏好设置，不会实际调度系统通知”。
- 设置弹窗展示通知权限状态。
- 点击 `发送测试通知` 后，成功时显示右下角轻提示。
- 点击 `发送测试通知` 后，失败时显示统一错误弹窗。
- 设置弹窗明确说明桌面通知仅在轻单运行期间触发。

### 2. 任务详情与备注

- 任务列表可打开任务详情弹窗。
- 详情弹窗可编辑标题、备注、优先级、任务组和截止日期。
- 详情弹窗展示创建时间、更新时间、完成时间和归档时间。
- 列表只展示备注摘要或备注标识，不展开完整备注。

### 3. 完成与归档

- 任务完成时写入 `completed_at`。
- 任务改回进行中时清空 `completed_at`。
- 已完成任务可单独归档。
- 批量模式可对全已完成选择集执行批量归档。
- 混有进行中任务时，批量归档不可用并显示原因。
- 归档任务默认从普通列表隐藏。
- 归档视图可查看已归档任务。

### 4. 复盘与质量提示

- 任务概览展示最近完成任务、本周复盘卡片、月度完成趋势和任务质量提示。
- 过短标题和重复标题只提醒，不阻断保存。
- 高优先级无备注任务可在详情或复盘中被提示。

## 验证命令

```bash
cmd /c npx.cmd vitest run --exclude=.worktrees/**
cmd /c npx.cmd tsc -b
cargo check
```
```

- [ ] **Step 2: Update active baseline docs**

In `docs/ARCHITECTURE.md`, update active pointers to `v0.40.0` and `docs/V040_ACCEPTANCE.md`. Add a short `v0.40.0 当前实施基线` section covering runtime desktop notification scope, `completed_at`, archive-not-delete, task detail notes, and review overview.

- [ ] **Step 3: Update worklog**

Append `2026-04-22 第 46 轮` to `docs/WORKLOG.md` with discussion, conclusions, and document updates for `v0.40.0`.

- [ ] **Step 4: Commit**

```bash
git add docs/V040_ACCEPTANCE.md docs/ARCHITECTURE.md docs/WORKLOG.md
git commit -m "docs: add v0.40.0 acceptance baseline"
```

## Task 2: SQLite/Rust 任务模型迁移

**Files:**
- Modify: `src-tauri/src/db/mod.rs`
- Modify: `src-tauri/src/db/tests.rs`
- Modify: `src-tauri/src/models/mod.rs`
- Modify: `src-tauri/src/commands/tasks.rs`

- [ ] **Step 1: Write failing migration test**

Add `init_database_adds_v040_task_columns_to_legacy_tasks_table` in `src-tauri/src/db/tests.rs`. The test creates a legacy `tasks` table without `note / completed_at / archived_at`, runs `init_database`, then asserts all three columns exist via `PRAGMA table_info(tasks)`.

- [ ] **Step 2: Run failing test**

```bash
cargo test init_database_adds_v040_task_columns_to_legacy_tasks_table -- --nocapture
```

Expected: FAIL before migration code exists.

- [ ] **Step 3: Implement migrations**

In `src-tauri/src/db/mod.rs`, add to `CREATE TABLE tasks`:

```sql
note TEXT NOT NULL DEFAULT '',
completed_at TEXT NULL,
archived_at TEXT NULL,
```

Add `ensure_tasks_v040_columns(connection)` that checks `PRAGMA table_info(tasks)` and runs:

```sql
ALTER TABLE tasks ADD COLUMN note TEXT NOT NULL DEFAULT '';
ALTER TABLE tasks ADD COLUMN completed_at TEXT NULL;
ALTER TABLE tasks ADD COLUMN archived_at TEXT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON tasks(archived_at DESC);
```

Call it from `init_database`.

- [ ] **Step 4: Update Rust models**

In `src-tauri/src/models/mod.rs`:

- Add `TaskArchiveFilter = Active / Archived / All` with `#[serde(rename_all = "kebab-case")]`.
- Add `note`, `completed_at`, `archived_at` to `TaskItem`.
- Add `note` to `CreateTaskInput` and `UpdateTaskInput`.
- Add `archive: Option<TaskArchiveFilter>` to `TaskQueryInput`.
- Add `archive: Option<bool>` to `BulkUpdateTasksInput`.

- [ ] **Step 5: Update task commands**

In `src-tauri/src/commands/tasks.rs`:

- Extend SELECT list and row mapper with `note / completed_at / archived_at`.
- Default `query_tasks` to `archived_at IS NULL`.
- Use `TaskArchiveFilter::Archived` for `archived_at IS NOT NULL`.
- Insert and update `note`.
- Toggle completion writes `completed_at = timestamp` when completing and `NULL` when reopening.
- Bulk `mark_completed` also updates `completed_at`.
- Bulk `archive: true` sets `archived_at = timestamp` only for completed tasks.

- [ ] **Step 6: Verify backend**

```bash
cargo test init_database_adds_v040_task_columns_to_legacy_tasks_table -- --nocapture
cargo check
```

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/db/mod.rs src-tauri/src/db/tests.rs src-tauri/src/models/mod.rs src-tauri/src/commands/tasks.rs
git commit -m "feat: add task completion archive fields"
```

## Task 3: TypeScript 模型、storage 和筛选语义

**Files:**
- Modify: `src/features/tasks/task.types.ts`
- Modify: `src/features/tasks/task.storage.ts`
- Modify: `src/features/tasks/task.filters.ts`
- Modify: `src/features/tasks/task.storage.test.ts`
- Modify: `src/features/tasks/task.filters.test.ts`

- [ ] **Step 1: Add tests**

Add tests proving normal query hides `archivedAt` tasks and `{ archive: 'archived' }` only shows archived tasks.

- [ ] **Step 2: Update types**

Add:

```ts
export type TaskArchiveFilter = 'active' | 'archived' | 'all'
export type NotificationPermissionStatus = 'allowed' | 'not-requested' | 'denied' | 'error'
```

Extend `TaskItem` with:

```ts
note: string
completedAt: string | null
archivedAt: string | null
```

Add `note` to create/update inputs, `archive` to query input, and `archive?: boolean` to bulk update input.

- [ ] **Step 3: Update storage**

In `task.storage.ts`:

- Extend zod schema with `note`, `completedAt`, `archivedAt`.
- Local create sets `note`, `completedAt: null`, `archivedAt: null`.
- Local update trims `note`.
- Local toggle sets/clears `completedAt`.
- Local bulk archive sets `archivedAt` for completed tasks only.
- Tauri payload passes `note`, `archive`, and query `archive`.

- [ ] **Step 4: Update filters**

In `task.filters.ts`, set `DEFAULT_TASK_QUERY.archive = 'active'`. In `applyTaskQuery`, filter archive before status:

```ts
if (query.archive === 'active') result = result.filter((task) => !task.archivedAt)
if (query.archive === 'archived') result = result.filter((task) => Boolean(task.archivedAt))
```

- [ ] **Step 5: Verify**

```bash
cmd /c npx.cmd vitest run src/features/tasks/task.filters.test.ts src/features/tasks/task.storage.test.ts --exclude=.worktrees/**
cmd /c npx.cmd tsc -b
```

- [ ] **Step 6: Commit**

```bash
git add src/features/tasks/task.types.ts src/features/tasks/task.storage.ts src/features/tasks/task.filters.ts src/features/tasks/task.storage.test.ts src/features/tasks/task.filters.test.ts
git commit -m "feat: add archive-aware task model"
```

## Task 4: Store 接入详情、归档和批量归档

**Files:**
- Modify: `src/stores/taskStore.ts`
- Modify: `src/stores/taskStore.test.ts`

- [ ] **Step 1: Add store tests**

Add tests for `archiveTask(taskId)`, `applyBulkArchive()`, `setArchiveFilter('archived')`, and detail state `openTaskDetail/closeTaskDetail`.

- [ ] **Step 2: Extend store state**

Add:

```ts
activeArchiveFilter: TaskArchiveFilter
editingTaskId: string | null
openTaskDetail: (taskId: string) => void
closeTaskDetail: () => void
setArchiveFilter: (filter: TaskArchiveFilter) => void
archiveTask: (taskId: string) => Promise<void>
applyBulkArchive: () => Promise<void>
```

Update `buildQuery` to include `archive: state.activeArchiveFilter`.

- [ ] **Step 3: Implement archive actions**

Use existing `bulkUpdateTasks({ taskIds, archive: true })`. On success rebuild `filteredTasks`, clear selected ids for bulk archive, and show success toast `任务已归档。` / `已归档选中任务。`. On failure show `归档失败` error dialog.

- [ ] **Step 4: Verify**

```bash
cmd /c npx.cmd vitest run src/stores/taskStore.test.ts --exclude=.worktrees/**
cmd /c npx.cmd tsc -b
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/taskStore.ts src/stores/taskStore.test.ts
git commit -m "feat: wire archive state and actions"
```

## Task 5: 任务质量检测和详情弹窗

**Files:**
- Create: `src/features/tasks/task.quality.ts`
- Create: `src/features/tasks/task.quality.test.ts`
- Create: `src/components/TaskDetailDialog.tsx`
- Create: `src/components/TaskDetailDialog.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add quality helper**

Create `getTaskQualityWarnings(task, allTasks)` returning exact warnings:

```ts
标题较短，后续可能不易回忆任务背景。
存在标题相同的任务，建议确认是否重复。
高优先级任务建议补充备注，方便回看处理背景。
```

Rules: title length `1..3`, exact duplicate trimmed title excluding self, `urgent/high` without note.

- [ ] **Step 2: Test quality helper**

Cover all three warnings in `task.quality.test.ts`.

- [ ] **Step 3: Create `TaskDetailDialog`**

Props:

```ts
isOpen: boolean
task: TaskItem | null
tasks: TaskItem[]
taskGroups: TaskGroup[]
isMutating: boolean
onClose: () => void
onSave: (input: UpdateTaskInput) => void | Promise<void>
onArchive: (taskId: string) => void | Promise<void>
```

Behavior: return `null` when closed, edit title/note/priority/group/due date, show meta times, show quality warnings, disable save for empty title, show `归档任务` only for completed non-archived task.

- [ ] **Step 4: Test detail dialog**

Test editing note calls `onSave` with updated `note`, and completed task shows `归档任务` calling `onArchive(task.id)`.

- [ ] **Step 5: Add styles**

Add styles for `.task-detail-grid`, `.task-detail-meta`, `.task-quality-warning`, `.task-note-summary`.

- [ ] **Step 6: Verify**

```bash
cmd /c npx.cmd vitest run src/features/tasks/task.quality.test.ts src/components/TaskDetailDialog.test.tsx --exclude=.worktrees/**
cmd /c npx.cmd tsc -b
```

- [ ] **Step 7: Commit**

```bash
git add src/features/tasks/task.quality.ts src/features/tasks/task.quality.test.ts src/components/TaskDetailDialog.tsx src/components/TaskDetailDialog.test.tsx src/index.css
git commit -m "feat: add task detail dialog and quality warnings"
```

## Task 6: 列表、AppShell、归档视图和批量归档 UI

**Files:**
- Modify: `src/app/AppShell.tsx`
- Modify: `src/components/TaskList.tsx`
- Modify: `src/components/TaskList.test.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add UI tests**

Cover: clicking `详情` calls `openTaskDetail(task.id)`; `批量归档` is disabled when selection contains active tasks; archive filter displays archived tasks.

- [ ] **Step 2: Add archive entry**

In `AppShell.tsx`, render `归档` in the left work view. Normal status filters set archive filter to `active`; archive entry sets it to `archived`.

- [ ] **Step 3: Wire detail dialog**

Find `editingTask` from `tasks` and render `TaskDetailDialog` with `updateTask` and `archiveTask`.

- [ ] **Step 4: Update list**

In `TaskList.tsx`, add `详情` button, note summary/marker, and `批量归档` in bulk toolbar. Compute `canBulkArchive = selectedTasks.length > 0 && selectedTasks.every((task) => task.completed)`.

- [ ] **Step 5: Verify**

```bash
cmd /c npx.cmd vitest run src/components/TaskList.test.tsx src/app/AppShell.test.tsx --exclude=.worktrees/**
cmd /c npx.cmd tsc -b
```

- [ ] **Step 6: Commit**

```bash
git add src/app/AppShell.tsx src/components/TaskList.tsx src/components/TaskList.test.tsx src/index.css
git commit -m "feat: add archive view and detail entry"
```

## Task 7: 复盘派生数据和概览扩展

**Files:**
- Modify: `src/features/tasks/task.overview.ts`
- Modify: `src/features/tasks/task.overview.test.ts`
- Modify: `src/components/TaskOverview.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add overview tests**

Test `buildTaskOverview` returns `review.recentCompleted`, `review.weekly.completed`, `review.weekly.archived`, `review.monthlyTrend`, and `review.quality`.

- [ ] **Step 2: Extend overview snapshot**

Add `ReviewSnapshot` with:

```ts
recentCompleted: TaskItem[]
monthlyTrend: Array<{ label: string; completed: number }>
weekly: { completed: number; archived: number; highestPriorityCompleted: number; overdueOpen: number }
quality: { shortTitleCount: number; duplicateTitleCount: number; highPriorityWithoutNoteCount: number }
```

- [ ] **Step 3: Implement review builders**

Use `completedAt` for completion stats. Include archived completed tasks in stats. Recent completed sorts by `completedAt` desc and returns top 10.

- [ ] **Step 4: Render review section**

In `TaskOverview.tsx`, add `复盘` section with recent completed list, weekly cards, monthly compact bars, quality cards, and empty state `最近还没有完成记录。`.

- [ ] **Step 5: Verify and commit**

```bash
cmd /c npx.cmd vitest run src/features/tasks/task.overview.test.ts --exclude=.worktrees/**
cmd /c npx.cmd tsc -b
git add src/features/tasks/task.overview.ts src/features/tasks/task.overview.test.ts src/components/TaskOverview.tsx src/index.css
git commit -m "feat: add task review overview"
```

## Task 8: 提醒系统权限状态和测试通知

**Files:**
- Modify: `src/stores/taskStore.ts`
- Modify: `src/stores/taskStore.test.ts`
- Modify: `src/components/TaskSettings.tsx`
- Modify: `src/components/TaskSettings.test.tsx`
- Modify: `src/app/AppShell.tsx`

- [ ] **Step 1: Add tests**

Store test: `sendTestDesktopNotification()` calls `sendNotification({ title: '轻单测试通知', body: '桌面系统通知可用。轻单运行期间会按提醒规则触发通知。' })`, sets status `allowed`, and shows success toast. Settings test asserts UI contains `发送测试通知` and `轻单运行期间`, and does not contain `不会实际调度系统通知`.

- [ ] **Step 2: Add store state/actions**

Add:

```ts
notificationPermissionStatus: NotificationPermissionStatus
refreshNotificationPermissionStatus: () => Promise<void>
sendTestDesktopNotification: () => Promise<void>
```

Status mapping: granted -> `allowed`, denied -> `denied`, caught error -> `error`, initial -> `not-requested`.

- [ ] **Step 3: Implement test notification**

Use existing `ensureDesktopNotificationPermission()`. If permission fails, show `测试通知失败` error dialog. If success, call `sendNotification` and show `测试通知已发送。` success toast.

- [ ] **Step 4: Update settings UI**

Add props for permission status, refresh, and test notification. Replace stale desktop copy with:

```tsx
开启后，轻单运行期间会按提醒规则触发桌面系统通知；应用关闭后不会后台提醒。
```

Render status and `发送测试通知` button.

- [ ] **Step 5: Verify and commit**

```bash
cmd /c npx.cmd vitest run src/stores/taskStore.test.ts src/components/TaskSettings.test.tsx --exclude=.worktrees/**
cmd /c npx.cmd tsc -b
git add src/stores/taskStore.ts src/stores/taskStore.test.ts src/components/TaskSettings.tsx src/components/TaskSettings.test.tsx src/app/AppShell.tsx
git commit -m "feat: add notification permission testing"
```

## Task 9: 全量验证、文档收口和推送

**Files:**
- Modify: `docs/WORKLOG.md`
- Possibly Modify: `src-tauri/gen/schemas/*.json` only if generated content actually changes.

- [ ] **Step 1: Full verification**

```bash
cmd /c npx.cmd vitest run --exclude=.worktrees/**
cmd /c npx.cmd tsc -b
cargo check
```

- [ ] **Step 2: Manual smoke**

Run `cmd /c npm.cmd run tauri:dev`, then verify settings notification status/test, detail note save, complete -> recent completed, archive -> hidden from normal list and visible in archive view, mixed bulk archive disabled.

- [ ] **Step 3: Update worklog**

Append implementation and verification notes to `2026-04-22 第 46 轮`.

- [ ] **Step 4: Commit docs**

```bash
git add docs/WORKLOG.md
git commit -m "docs: record v0.40.0 implementation"
```

- [ ] **Step 5: Push**

```powershell
$env:GIT_SSH_COMMAND='ssh -i C:/Users/admin/.ollama/id_ed25519 -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new -o KexAlgorithms=curve25519-sha256,diffie-hellman-group14-sha256'
git push origin HEAD
```

## Self-Review Checklist

- 提醒系统收口: Task 8.
- 完成与复盘增强: Task 2, Task 3, Task 4, Task 6, Task 7.
- 任务详情与整理轻量增强: Task 5, Task 6, Task 7.
- 文档基线和验收: Task 1, Task 9.
- 未计划任何删除、自动删除、后台守护、通知历史、标签系统、多提醒规则或云同步。
- Vitest 全量命令显式排除 `.worktrees`。
