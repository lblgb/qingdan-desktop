# v0.50.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 完成轻单 `v0.50.0` 的深色科技控制台 UI 改版、备份恢复中心、数据导出以及全局搜索与快速定位。

**Architecture:** 本版在保持 `AppShell + taskStore + TaskList + TaskOverview + TaskSettings` 主结构不变的前提下，新增统一的控制台风格设计变量、右上角系统入口组、备份恢复与导出命令边界，以及基于现有任务数据的轻量搜索层。数据安全相关能力统一经由 Tauri 命令层处理文件读写，前端只负责状态编排、交互确认与反馈。搜索与定位继续依赖 `taskStore` 的统一筛选与高亮能力，避免在组件层重复维护查询状态。

**Tech Stack:** Tauri 2, React 19, TypeScript, Zustand, Vitest, Rust, SQLite

---

## File Map

### Frontend files to modify

- `src/index.css`
  - 定义 `v0.50.0` 控制台风格全局变量、字体、按钮、卡片、图标入口、角标、面板与动效基础样式。
- `src/app/AppShell.tsx`
  - 重构顶部控制条、系统图标组、备份入口、搜索入口与弹窗装配逻辑。
- `src/app/AppShell.test.tsx`
  - 覆盖系统图标入口、提醒角标、搜索入口与备份入口的装配。
- `src/components/TaskSettings.tsx`
  - 从大按钮入口调整为图标入口触发后的系统面板内容。
- `src/components/TaskReminderCenter.tsx`
  - 统一控制台面板风格，配合提醒角标语义。
- `src/components/TaskList.tsx`
  - 调整列表工具条、任务行模块卡、状态芯片与“导出当前结果”快捷出口。
- `src/components/TaskList.test.tsx`
  - 覆盖导出当前筛选结果入口与搜索定位后的高亮兜底。
- `src/components/TaskOverview.tsx`
  - 统一控制台视觉风格，提升统计区、趋势区与质量提示的面板表达。
- `src/components/TaskDetailDialog.tsx`
  - 统一弹窗语言与视觉风格。
- `src/stores/taskStore.ts`
  - 增加搜索状态、搜索结果定位、备份与导出动作反馈、备份中心弹窗状态。
- `src/stores/taskStore.test.ts`
  - 覆盖搜索与定位、备份反馈、导出反馈、提醒角标计数来源。
- `src/features/tasks/task.types.ts`
  - 增加备份元信息、导出类型、搜索结果项等前端类型。
- `src/features/tasks/task.storage.ts`
  - 增加 `createBackup` / `restoreBackup` / `exportTasks` / `searchTasks` 封装。
- `src/features/tasks/task.storage.test.ts`
  - 覆盖 Tauri 参数映射与导出/备份命令契约。
- `src/features/tasks/task.filters.ts`
  - 提供导出当前筛选结果所需复用查询输入。
- `src/features/tasks/task.search.ts`
  - 新建轻量搜索与结果排序逻辑。
- `src/features/tasks/task.search.test.ts`
  - 覆盖标题/备注搜索、结果排序、定位结果。
- `src/components/BackupCenter.tsx`
  - 新建备份恢复中心面板。
- `src/components/BackupCenter.test.tsx`
  - 覆盖备份创建、恢复确认、导出入口与状态展示。
- `src/components/GlobalTaskSearch.tsx`
  - 新建顶部轻量搜索面板。
- `src/components/GlobalTaskSearch.test.tsx`
  - 覆盖搜索输入、结果点击和清空行为。

### Backend files to modify

- `src-tauri/src/commands/tasks.rs`
  - 增加导出查询所需现有任务读取边界。
- `src-tauri/src/commands/system.rs`
  - 增加备份、恢复、导出相关命令。
- `src-tauri/src/lib.rs`
  - 注册新命令。
- `src-tauri/src/models/mod.rs`
  - 增加备份元信息、恢复输入、导出输入与导出格式枚举。
- `src-tauri/src/db/mod.rs`
  - 增加数据库备份文件创建与恢复辅助函数。
- `src-tauri/src/db/tests.rs`
  - 覆盖备份文件生成与恢复后的数据保持。

### Docs to modify

- `docs/ARCHITECTURE.md`
  - 切换活跃版本到 `v0.50.0`，记录新基线。
- `docs/PROJECT_CONSTRAINTS.md`
  - 切换活跃版本到 `v0.50.0`。
- `docs/WORKLOG.md`
  - 记录本轮设计、实现与验证。
- `docs/V050_ACCEPTANCE.md`
  - 新建 `v0.50.0` 手工验收清单。

---

### Task 1: 建立 v0.50.0 文档基线

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/PROJECT_CONSTRAINTS.md`
- Modify: `docs/WORKLOG.md`
- Create: `docs/V050_ACCEPTANCE.md`
- Test: `docs/superpowers/specs/2026-04-24-v050-design.md`

- [ ] **Step 1: 写验收清单草案**

```md
# `v0.50.0` 验收清单

## 说明

本清单是 `v0.50.0` 当前唯一有效的手工验收基线。

## 验收项

### 1. 科技控制台 UI

- 顶部动作区调整为主控制条。
- 右上角存在 `备份 / 提醒 / 设置` 图标入口。
- `提醒` 图标存在待处理数量角标。
- 左侧工作视图、任务列表、概览和弹窗均统一为深色科技控制台风格。

### 2. 备份与恢复中心

- 右上角存在独立备份入口。
- 可手动创建备份文件。
- 可选择备份文件恢复，恢复前有二次确认。
- 可展示最近备份信息。

### 3. 数据导出

- 备份中心支持全量导出 JSON / CSV。
- 列表工具条支持导出当前筛选结果。

### 4. 搜索与定位

- 顶部存在搜索入口。
- 支持标题与备注搜索。
- 点击搜索结果后可自动定位并高亮目标任务。
```

- [ ] **Step 2: 保存验收清单草案**

Run: 手动将上述内容写入 `docs/V050_ACCEPTANCE.md`
Expected: 文件创建成功

- [ ] **Step 3: 更新架构文档活跃版本**

```md
## 当前活跃基线

- 当前活跃版本：`v0.50.0`
- 当前实施范围：本文档 `v0.50.0` 章节
- 当前手工验收清单：[`docs/V050_ACCEPTANCE.md`](./V050_ACCEPTANCE.md)
```

- [ ] **Step 4: 在架构文档增加 v0.50.0 基线章节**

```md
## `v0.50.0` 当前实施基线

### 版本目标

- 完成深色科技控制台 UI 改版。
- 补齐备份恢复、导出与全局搜索能力。

### 当前纳入范围

- 科技控制台 UI 改版
- 备份与恢复中心
- 数据导出
- 全局搜索与快速定位
```

- [ ] **Step 5: 更新项目约束活跃版本**

```md
- 当前活跃版本：`v0.50.0`
- 当前手工验收清单：[`docs/V050_ACCEPTANCE.md`](./V050_ACCEPTANCE.md)
```

- [ ] **Step 6: 在工作日志增加新轮次记录**

```md
## 2026-04-24 第 49 轮

### 讨论主题

- 建立 `v0.50.0` 文档基线与验收口径。
```

- [ ] **Step 7: 检查文档 diff**

Run: `git diff -- docs/ARCHITECTURE.md docs/PROJECT_CONSTRAINTS.md docs/WORKLOG.md docs/V050_ACCEPTANCE.md`
Expected: 只包含 `v0.50.0` 相关文档变更

- [ ] **Step 8: 提交**

```bash
git add docs/ARCHITECTURE.md docs/PROJECT_CONSTRAINTS.md docs/WORKLOG.md docs/V050_ACCEPTANCE.md
git commit -m "docs: add v0.50.0 baseline"
```

### Task 2: 建立控制台视觉基础与系统图标入口骨架

**Files:**
- Modify: `src/index.css`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/app/AppShell.test.tsx`
- Modify: `src/components/TaskSettings.tsx`
- Modify: `src/components/TaskReminderCenter.tsx`
- Test: `src/app/AppShell.test.tsx`

- [ ] **Step 1: 为 AppShell 装配图标入口写失败测试**

```tsx
it('renders system icon entries for backup reminder and settings', () => {
  render(<AppShell />)

  expect(screen.getByRole('button', { name: '备份与恢复' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '提醒中心' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: '设置' })).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cmd /c npx.cmd vitest run src/app/AppShell.test.tsx`
Expected: FAIL，找不到 `备份与恢复` 图标入口

- [ ] **Step 3: 增加控制台主题变量**

```css
:root {
  --console-bg: #050b18;
  --console-panel: #091224;
  --console-panel-strong: #0d1a31;
  --console-border: rgba(34, 211, 238, 0.16);
  --console-glow: rgba(34, 211, 238, 0.28);
  --console-text: #e6f6ff;
  --console-muted: #7f9bb0;
  --console-success: #22c55e;
}
```

- [ ] **Step 4: 在 AppShell 增加右上角系统图标组骨架**

```tsx
<div className="app-shell-system-actions" aria-label="系统入口">
  <button aria-label="备份与恢复" className="icon-button" type="button">
    <span aria-hidden="true">备</span>
  </button>
  <button aria-label="提醒中心" className="icon-button" type="button">
    <span aria-hidden="true">铃</span>
    {pendingReminderCount > 0 ? <span className="icon-badge">{pendingReminderCount}</span> : null}
  </button>
  <TaskSettings ... />
</div>
```

- [ ] **Step 5: 为 TaskSettings 改成图标入口最小实现**

```tsx
<button
  aria-expanded={isOpen}
  aria-haspopup="dialog"
  aria-label="设置"
  className="icon-button"
  onClick={() => onOpenChange(true)}
  type="button"
>
  <span aria-hidden="true" className="icon-button-glyph">设</span>
</button>
```

- [ ] **Step 6: 给提醒按钮角标补最小样式**

```css
.icon-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background: linear-gradient(135deg, #22d3ee, #3b82f6);
  color: #04101f;
  font-size: 11px;
  font-weight: 700;
}
```

- [ ] **Step 7: 运行测试确认通过**

Run: `cmd /c npx.cmd vitest run src/app/AppShell.test.tsx`
Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add src/index.css src/app/AppShell.tsx src/app/AppShell.test.tsx src/components/TaskSettings.tsx src/components/TaskReminderCenter.tsx
git commit -m "feat: add console system action bar"
```

### Task 3: 完成任务列表、概览与弹窗的控制台风格统一

**Files:**
- Modify: `src/components/TaskList.tsx`
- Modify: `src/components/TaskList.test.tsx`
- Modify: `src/components/TaskOverview.tsx`
- Modify: `src/components/TaskDetailDialog.tsx`
- Modify: `src/index.css`
- Test: `src/components/TaskList.test.tsx`

- [ ] **Step 1: 为任务行状态芯片写失败测试**

```tsx
it('renders task metadata as console status chips', () => {
  render(<TaskList tasks={[buildTask({ priority: 'urgent', dueAt: '2026-04-24T10:00:00.000Z' })]} ... />)

  expect(screen.getByText('紧急')).toHaveClass('task-status-chip')
  expect(screen.getByText(/2026-04-24/)).toHaveClass('task-status-chip')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cmd /c npx.cmd vitest run src/components/TaskList.test.tsx`
Expected: FAIL，任务元信息未使用统一状态芯片类名

- [ ] **Step 3: 在 TaskList 中重组任务行结构**

```tsx
<article className="task-row-card">
  <div className="task-row-main">...</div>
  <div className="task-row-meta">
    <span className="task-status-chip task-status-chip-priority">{priorityLabel}</span>
    {task.dueAt ? <span className="task-status-chip">{formatDueAt(task.dueAt)}</span> : null}
    {groupName ? <span className="task-status-chip">{groupName}</span> : null}
  </div>
</article>
```

- [ ] **Step 4: 为概览面板加入控制台统计区类名**

```tsx
<section className="overview-console-panel">
  <header className="overview-console-header">...</header>
  <div className="overview-console-grid">...</div>
</section>
```

- [ ] **Step 5: 为任务详情弹窗统一控制台头部和按钮行**

```tsx
<section className="task-modal task-modal-console" ...>
  <div className="task-modal-header task-modal-header-console">...</div>
</section>
```

- [ ] **Step 6: 为任务卡、概览面板和弹窗添加样式**

```css
.task-row-card {
  border: 1px solid var(--console-border);
  background: linear-gradient(180deg, rgba(8, 15, 29, 0.92), rgba(10, 20, 38, 0.88));
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.28);
}

.task-status-chip {
  border-radius: 999px;
  border: 1px solid rgba(34, 211, 238, 0.18);
  color: var(--console-text);
}
```

- [ ] **Step 7: 运行测试确认通过**

Run: `cmd /c npx.cmd vitest run src/components/TaskList.test.tsx src/app/AppShell.test.tsx`
Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add src/components/TaskList.tsx src/components/TaskList.test.tsx src/components/TaskOverview.tsx src/components/TaskDetailDialog.tsx src/index.css
git commit -m "feat: restyle workspace as console dashboard"
```

### Task 4: 新建备份与恢复中心前端面板

**Files:**
- Create: `src/components/BackupCenter.tsx`
- Create: `src/components/BackupCenter.test.tsx`
- Modify: `src/app/AppShell.tsx`
- Modify: `src/index.css`
- Modify: `src/stores/taskStore.ts`
- Modify: `src/stores/taskStore.test.ts`
- Test: `src/components/BackupCenter.test.tsx`

- [ ] **Step 1: 为备份中心入口和最近备份信息写失败测试**

```tsx
it('renders backup center with recent backup summary', () => {
  render(
    <BackupCenter
      isOpen
      latestBackupAt="2026-04-24T09:30:00.000Z"
      onCreateBackup={vi.fn()}
      onRestoreBackup={vi.fn()}
      onExportAllJson={vi.fn()}
      onExportAllCsv={vi.fn()}
      onOpenChange={vi.fn()}
    />,
  )

  expect(screen.getByText('备份与恢复中心')).toBeInTheDocument()
  expect(screen.getByText(/2026-04-24/)).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cmd /c npx.cmd vitest run src/components/BackupCenter.test.tsx`
Expected: FAIL，文件不存在

- [ ] **Step 3: 写最小 BackupCenter 组件**

```tsx
export function BackupCenter(props: BackupCenterProps) {
  return props.isOpen ? (
    <section aria-label="备份与恢复中心" className="task-modal task-modal-console">
      <h2>备份与恢复中心</h2>
      <p>{props.latestBackupAt ?? '尚无备份记录'}</p>
      <button onClick={() => void props.onCreateBackup()} type="button">立即备份</button>
      <button onClick={() => void props.onRestoreBackup()} type="button">从备份恢复</button>
      <button onClick={() => void props.onExportAllJson()} type="button">导出 JSON</button>
      <button onClick={() => void props.onExportAllCsv()} type="button">导出 CSV</button>
    </section>
  ) : null
}
```

- [ ] **Step 4: 在 taskStore 中增加备份中心状态字段**

```ts
backupCenterOpen: false,
latestBackupAt: null,
openBackupCenter: () => set({ backupCenterOpen: true }),
closeBackupCenter: () => set({ backupCenterOpen: false }),
```

- [ ] **Step 5: 在 AppShell 接入独立备份图标与面板**

```tsx
<button aria-label="备份与恢复" className="icon-button" onClick={openBackupCenter} type="button">
  <span aria-hidden="true">备</span>
</button>
<BackupCenter
  isOpen={backupCenterOpen}
  latestBackupAt={latestBackupAt}
  onCreateBackup={createBackup}
  onRestoreBackup={restoreBackup}
  onExportAllJson={() => exportTasks('json', 'all')}
  onExportAllCsv={() => exportTasks('csv', 'all')}
  onOpenChange={(open) => (open ? openBackupCenter() : closeBackupCenter())}
/>
```

- [ ] **Step 6: 为备份中心写控制台面板样式**

```css
.backup-center-grid {
  display: grid;
  gap: 14px;
}

.backup-center-card {
  border-radius: 20px;
  border: 1px solid var(--console-border);
  background: rgba(8, 15, 29, 0.86);
}
```

- [ ] **Step 7: 运行测试确认通过**

Run: `cmd /c npx.cmd vitest run src/components/BackupCenter.test.tsx src/app/AppShell.test.tsx`
Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add src/components/BackupCenter.tsx src/components/BackupCenter.test.tsx src/app/AppShell.tsx src/index.css src/stores/taskStore.ts src/stores/taskStore.test.ts
git commit -m "feat: add backup center panel"
```

### Task 5: 落 Tauri 备份与恢复命令

**Files:**
- Modify: `src-tauri/src/commands/system.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/models/mod.rs`
- Modify: `src-tauri/src/db/mod.rs`
- Modify: `src-tauri/src/db/tests.rs`
- Test: `src-tauri/src/db/tests.rs`

- [ ] **Step 1: 为数据库备份写失败测试**

```rust
#[test]
fn create_backup_copies_database_file() {
    let db_path = legacy_database_path();
    init_database(&db_path).expect("init db");
    let backup_path = db_path.with_file_name("backup-copy.db");

    create_backup_file(&db_path, &backup_path).expect("create backup");

    assert!(backup_path.exists());
}
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cargo test create_backup_copies_database_file`
Expected: FAIL，`create_backup_file` 未定义

- [ ] **Step 3: 在 db/mod.rs 增加备份函数最小实现**

```rust
pub fn create_backup_file(db_path: &PathBuf, backup_path: &PathBuf) -> Result<(), String> {
    std::fs::copy(db_path, backup_path)
        .map(|_| ())
        .map_err(|error| format!("create backup file failed: {error}"))
}
```

- [ ] **Step 4: 在 db/mod.rs 增加恢复函数最小实现**

```rust
pub fn restore_backup_file(backup_path: &PathBuf, db_path: &PathBuf) -> Result<(), String> {
    std::fs::copy(backup_path, db_path)
        .map(|_| ())
        .map_err(|error| format!("restore backup file failed: {error}"))
}
```

- [ ] **Step 5: 在 models/mod.rs 增加输入模型**

```rust
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RestoreBackupInput {
    pub backup_path: String,
}
```

- [ ] **Step 6: 在 commands/system.rs 增加命令**

```rust
#[tauri::command]
pub fn create_backup(state: State<'_, DatabaseState>) -> Result<String, String> {
    let backup_path = state.db_path.with_file_name(format!("qingdan-backup-{}.db", chrono_like_timestamp()?));
    create_backup_file(&state.db_path, &backup_path)?;
    Ok(backup_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn restore_backup(input: RestoreBackupInput, state: State<'_, DatabaseState>) -> Result<(), String> {
    restore_backup_file(&PathBuf::from(input.backup_path), &state.db_path)
}
```

- [ ] **Step 7: 在 lib.rs 注册命令**

```rust
commands::system::create_backup,
commands::system::restore_backup,
```

- [ ] **Step 8: 运行测试确认通过**

Run: `cargo test create_backup_copies_database_file`
Expected: PASS

- [ ] **Step 9: 提交**

```bash
git add src-tauri/src/commands/system.rs src-tauri/src/lib.rs src-tauri/src/models/mod.rs src-tauri/src/db/mod.rs src-tauri/src/db/tests.rs
git commit -m "feat: add backup and restore commands"
```

### Task 6: 落前端备份与恢复行为接线

**Files:**
- Modify: `src/features/tasks/task.storage.ts`
- Modify: `src/features/tasks/task.storage.test.ts`
- Modify: `src/stores/taskStore.ts`
- Modify: `src/stores/taskStore.test.ts`
- Modify: `src/components/BackupCenter.tsx`
- Test: `src/stores/taskStore.test.ts`

- [ ] **Step 1: 为备份调用映射写失败测试**

```ts
it('invokes create_backup in tauri runtime and returns backup path', async () => {
  mockInvoke.mockResolvedValueOnce('C:/backup/qingdan-backup.db')
  mockTauriWindow()

  await expect(createBackup()).resolves.toBe('C:/backup/qingdan-backup.db')
  expect(mockInvoke).toHaveBeenCalledWith('create_backup')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cmd /c npx.cmd vitest run src/features/tasks/task.storage.test.ts`
Expected: FAIL，`createBackup` 未定义

- [ ] **Step 3: 在 task.storage.ts 增加备份恢复封装**

```ts
export async function createBackup(): Promise<string> {
  return invoke<string>('create_backup')
}

export async function restoreBackup(backupPath: string): Promise<void> {
  await invoke('restore_backup', { input: { backupPath } })
}
```

- [ ] **Step 4: 在 taskStore 中增加动作**

```ts
createBackup: async () => {
  const backupPath = await createBackup()
  set({
    latestBackupAt: new Date().toISOString(),
    successToast: { tone: 'success', message: '备份已创建。', source: 'reminder' },
  })
  return backupPath
},
restoreBackup: async (backupPath) => {
  await restoreBackup(backupPath)
  await get().hydrateTasks()
}
```

- [ ] **Step 5: 在 BackupCenter 中接恢复确认**

```tsx
const confirmed = window.confirm('恢复会覆盖当前本地数据，是否继续？')
if (confirmed) {
  void props.onRestoreBackup()
}
```

- [ ] **Step 6: 为成功和失败反馈补测试**

```ts
it('updates latest backup time after successful backup creation', async () => {
  mockCreateBackup.mockResolvedValueOnce('C:/backup/qingdan-backup.db')
  const { useTaskStore } = await loadStore()

  await useTaskStore.getState().createBackup()

  expect(useTaskStore.getState().latestBackupAt).not.toBeNull()
})
```

- [ ] **Step 7: 运行测试确认通过**

Run: `cmd /c npx.cmd vitest run src/features/tasks/task.storage.test.ts src/stores/taskStore.test.ts src/components/BackupCenter.test.tsx`
Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add src/features/tasks/task.storage.ts src/features/tasks/task.storage.test.ts src/stores/taskStore.ts src/stores/taskStore.test.ts src/components/BackupCenter.tsx
git commit -m "feat: wire backup center actions"
```

### Task 7: 增加导出命令与全量导出入口

**Files:**
- Modify: `src-tauri/src/commands/system.rs`
- Modify: `src-tauri/src/models/mod.rs`
- Modify: `src/features/tasks/task.storage.ts`
- Modify: `src/features/tasks/task.storage.test.ts`
- Modify: `src/components/BackupCenter.tsx`
- Modify: `src/components/BackupCenter.test.tsx`
- Test: `src/features/tasks/task.storage.test.ts`

- [ ] **Step 1: 为导出命令参数映射写失败测试**

```ts
it('invokes export_tasks with json format and all scope', async () => {
  mockInvoke.mockResolvedValueOnce('C:/exports/tasks.json')
  mockTauriWindow()

  await exportTasks('json', 'all')

  expect(mockInvoke).toHaveBeenCalledWith('export_tasks', {
    input: { format: 'json', scope: 'all', query: null },
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cmd /c npx.cmd vitest run src/features/tasks/task.storage.test.ts`
Expected: FAIL，`exportTasks` 未定义

- [ ] **Step 3: 在 models/mod.rs 增加导出模型**

```rust
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ExportFormat {
    Json,
    Csv,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportTasksInput {
    pub format: ExportFormat,
    pub scope: String,
    pub query: Option<TaskQueryInput>,
}
```

- [ ] **Step 4: 在 system.rs 增加导出命令最小实现**

```rust
#[tauri::command]
pub fn export_tasks(input: ExportTasksInput, state: State<'_, DatabaseState>) -> Result<String, String> {
    let tasks = match input.query {
        Some(query) => super::tasks::query_tasks_inner(&state, &query)?,
        None => super::tasks::list_tasks_inner(&state)?,
    };
    let export_path = build_export_path(&input.format)?;
    write_export_file(&export_path, &tasks, input.format)?;
    Ok(export_path.to_string_lossy().to_string())
}
```

- [ ] **Step 5: 在 task.storage.ts 增加前端封装**

```ts
export async function exportTasks(format: 'json' | 'csv', scope: 'all' | 'filtered', query?: TaskQueryInput) {
  return invoke<string>('export_tasks', {
    input: {
      format,
      scope,
      query: scope === 'filtered' ? buildTauriQueryInput(query!) : null,
    },
  })
}
```

- [ ] **Step 6: 在 BackupCenter 添加全量导出按钮**

```tsx
<button onClick={() => void props.onExportAllJson()} type="button">导出全部 JSON</button>
<button onClick={() => void props.onExportAllCsv()} type="button">导出全部 CSV</button>
```

- [ ] **Step 7: 运行测试确认通过**

Run: `cmd /c npx.cmd vitest run src/features/tasks/task.storage.test.ts src/components/BackupCenter.test.tsx`
Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add src-tauri/src/commands/system.rs src-tauri/src/models/mod.rs src/features/tasks/task.storage.ts src/features/tasks/task.storage.test.ts src/components/BackupCenter.tsx src/components/BackupCenter.test.tsx
git commit -m "feat: add export actions"
```

### Task 8: 在列表工具条增加导出当前筛选结果

**Files:**
- Modify: `src/components/TaskList.tsx`
- Modify: `src/components/TaskList.test.tsx`
- Modify: `src/stores/taskStore.ts`
- Modify: `src/stores/taskStore.test.ts`
- Test: `src/components/TaskList.test.tsx`

- [ ] **Step 1: 为导出当前筛选结果按钮写失败测试**

```tsx
it('renders export current results action in task toolbar', () => {
  render(<TaskList tasks={[buildTask()]} ... />)
  expect(screen.getByRole('button', { name: '导出当前结果' })).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cmd /c npx.cmd vitest run src/components/TaskList.test.tsx`
Expected: FAIL，未找到 `导出当前结果`

- [ ] **Step 3: 在 taskStore 增加导出当前结果动作**

```ts
exportCurrentResults: async () => {
  const query = buildQuery(get())
  await exportTasks('csv', 'filtered', query)
  set({
    successToast: { tone: 'success', message: '当前结果已导出。', source: 'bulk' },
  })
}
```

- [ ] **Step 4: 在 TaskList 工具条接按钮**

```tsx
<button className="secondary-button" onClick={() => void onExportCurrentResults()} type="button">
  导出当前结果
</button>
```

- [ ] **Step 5: 运行测试确认通过**

Run: `cmd /c npx.cmd vitest run src/components/TaskList.test.tsx src/stores/taskStore.test.ts`
Expected: PASS

- [ ] **Step 6: 提交**

```bash
git add src/components/TaskList.tsx src/components/TaskList.test.tsx src/stores/taskStore.ts src/stores/taskStore.test.ts
git commit -m "feat: export current filtered tasks"
```

### Task 9: 增加搜索逻辑与结果面板

**Files:**
- Create: `src/features/tasks/task.search.ts`
- Create: `src/features/tasks/task.search.test.ts`
- Create: `src/components/GlobalTaskSearch.tsx`
- Create: `src/components/GlobalTaskSearch.test.tsx`
- Modify: `src/features/tasks/task.types.ts`
- Modify: `src/stores/taskStore.ts`
- Modify: `src/stores/taskStore.test.ts`
- Modify: `src/app/AppShell.tsx`
- Test: `src/features/tasks/task.search.test.ts`

- [ ] **Step 1: 写标题与备注搜索失败测试**

```ts
it('matches tasks by title and note', () => {
  const results = searchTasks(
    [
      buildTask({ id: 'a', title: '备份中心', note: '恢复入口' }),
      buildTask({ id: 'b', title: '列表优化', note: '控制台视觉' }),
    ],
    '恢复',
  )

  expect(results.map((item) => item.task.id)).toEqual(['a'])
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cmd /c npx.cmd vitest run src/features/tasks/task.search.test.ts`
Expected: FAIL，文件不存在

- [ ] **Step 3: 写最小搜索实现**

```ts
export function searchTasks(tasks: TaskItem[], keyword: string): TaskSearchResult[] {
  const normalizedKeyword = keyword.trim().toLowerCase()
  if (!normalizedKeyword) {
    return []
  }

  return tasks
    .filter((task) =>
      `${task.title} ${task.note}`.toLowerCase().includes(normalizedKeyword),
    )
    .map((task) => ({ task }))
}
```

- [ ] **Step 4: 增加 GlobalTaskSearch 组件**

```tsx
export function GlobalTaskSearch(props: GlobalTaskSearchProps) {
  return (
    <div className="global-task-search">
      <input
        aria-label="搜索任务"
        value={props.keyword}
        onChange={(event) => props.onKeywordChange(event.target.value)}
      />
      {props.results.map((result) => (
        <button key={result.task.id} onClick={() => props.onSelect(result.task.id)} type="button">
          {result.task.title}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: 在 taskStore 中增加搜索状态**

```ts
searchKeyword: '',
searchResults: [],
setSearchKeyword: (keyword) =>
  set((state) => ({
    searchKeyword: keyword,
    searchResults: searchTasks(state.tasks, keyword),
  })),
```

- [ ] **Step 6: 在 AppShell 顶部接搜索面板**

```tsx
<GlobalTaskSearch
  keyword={searchKeyword}
  results={searchResults}
  onKeywordChange={setSearchKeyword}
  onSelect={(taskId) => void focusTaskFromSearch(taskId)}
/>
```

- [ ] **Step 7: 运行测试确认通过**

Run: `cmd /c npx.cmd vitest run src/features/tasks/task.search.test.ts src/components/GlobalTaskSearch.test.tsx`
Expected: PASS

- [ ] **Step 8: 提交**

```bash
git add src/features/tasks/task.search.ts src/features/tasks/task.search.test.ts src/components/GlobalTaskSearch.tsx src/components/GlobalTaskSearch.test.tsx src/features/tasks/task.types.ts src/stores/taskStore.ts src/stores/taskStore.test.ts src/app/AppShell.tsx
git commit -m "feat: add global task search"
```

### Task 10: 接搜索定位与任务高亮闭环

**Files:**
- Modify: `src/stores/taskStore.ts`
- Modify: `src/stores/taskStore.test.ts`
- Modify: `src/components/TaskList.tsx`
- Modify: `src/components/TaskList.test.tsx`
- Modify: `src/app/AppShell.tsx`
- Test: `src/stores/taskStore.test.ts`

- [ ] **Step 1: 为搜索结果点击后重置筛选与定位写失败测试**

```ts
it('resets filters and queues reminder-style navigation when selecting a search result', async () => {
  const { useTaskStore } = await loadStore()
  useTaskStore.setState({
    tasks: [buildTask({ id: 'target-task', title: '备份中心' })],
    activeFilter: 'completed',
  })

  await useTaskStore.getState().focusTaskFromSearch('target-task')

  expect(useTaskStore.getState().activeFilter).toBe('all')
  expect(useTaskStore.getState().reminderNavigation?.taskId).toBe('target-task')
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cmd /c npx.cmd vitest run src/stores/taskStore.test.ts`
Expected: FAIL，`focusTaskFromSearch` 未定义

- [ ] **Step 3: 在 taskStore 中增加最小实现**

```ts
focusTaskFromSearch: async (taskId) =>
  set((state) => ({
    activeFilter: 'all',
    activeArchiveFilter: 'all',
    activeGroupFilter: 'all-groups',
    activePriorityFilter: 'all-priorities',
    activeDateRange: 'all-time',
    activeSortBy: 'default',
    filteredTasks: buildVisibleTasks(state.tasks, DEFAULT_TASK_QUERY),
    searchKeyword: '',
    searchResults: [],
    reminderNavigation: { taskId, requestedAt: Date.now() },
  })),
```

- [ ] **Step 4: 在 TaskList 中复用现有定位高亮逻辑**

```tsx
const shouldHighlight = reminderNavigation?.taskId === task.id
<article className={shouldHighlight ? 'task-row-card task-row-card-highlighted' : 'task-row-card'}>
```

- [ ] **Step 5: 为高亮类名补最小样式**

```css
.task-row-card-highlighted {
  border-color: rgba(34, 211, 238, 0.45);
  box-shadow: 0 0 0 1px rgba(34, 211, 238, 0.16), 0 0 32px rgba(34, 211, 238, 0.16);
}
```

- [ ] **Step 6: 运行测试确认通过**

Run: `cmd /c npx.cmd vitest run src/stores/taskStore.test.ts src/components/TaskList.test.tsx`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add src/stores/taskStore.ts src/stores/taskStore.test.ts src/components/TaskList.tsx src/components/TaskList.test.tsx src/app/AppShell.tsx src/index.css
git commit -m "feat: add search result focus flow"
```

### Task 11: 全量验证与文档收口

**Files:**
- Modify: `docs/WORKLOG.md`

- [ ] **Step 1: 更新工作日志实现记录**

```md
### 实现记录

- 完成科技控制台 UI 改版骨架。
- 完成备份与恢复中心。
- 完成 JSON / CSV 导出能力。
- 完成顶部搜索与快速定位闭环。
```

- [ ] **Step 2: 跑前端测试**

Run: `cmd /c npx.cmd vitest run --exclude=.worktrees/**`
Expected: PASS

- [ ] **Step 3: 跑 TypeScript 构建**

Run: `cmd /c npx.cmd tsc -b`
Expected: PASS

- [ ] **Step 4: 跑 Rust 测试**

Run: `cargo test`
Expected: PASS

- [ ] **Step 5: 跑 Rust 编译检查**

Run: `cargo check`
Expected: PASS

- [ ] **Step 6: 打正式安装包**

Run: `cmd /c npm.cmd run tauri:build`
Expected: 生成 `轻单_0.50.0_x64-setup.exe` 与 `轻单_0.50.0_x64_zh-CN.msi`

- [ ] **Step 7: 提交**

```bash
git add docs/WORKLOG.md
git commit -m "docs: record v0.50.0 implementation"
```

## Self-Review

### Spec coverage

- UI 主改版：Task 2, Task 3
- 备份与恢复中心：Task 4, Task 5, Task 6
- 数据导出：Task 7, Task 8
- 搜索与快速定位：Task 9, Task 10
- 文档与验收基线：Task 1, Task 11

无遗漏项。

### Placeholder scan

- 未使用 `TBD`、`TODO` 或“类似前一任务”的占位表达。
- 每个任务都包含具体文件、命令和最小代码骨架。

### Type consistency

- 前端统一使用 `createBackup` / `restoreBackup` / `exportTasks` / `focusTaskFromSearch`
- 备份中心统一使用 `BackupCenter`
- 搜索组件统一使用 `GlobalTaskSearch`

命名在任务间保持一致。
