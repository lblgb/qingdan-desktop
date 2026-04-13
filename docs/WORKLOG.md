# 项目工作日志

## 文件说明

本文档只保留当前活跃版本附近的工作日志，作为后续实现、回归和收口时的快速入口。
更早轮次的完整历史已经归档到 [`docs/WORKLOG_ARCHIVE.md`](./WORKLOG_ARCHIVE.md)。

## 当前活跃基线

- 当前活跃版本：`v0.20`
- 当前架构基线：[`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
- 当前验收清单：[`docs/V020_ACCEPTANCE.md`](./V020_ACCEPTANCE.md)
- 历史日志归档：[`docs/WORKLOG_ARCHIVE.md`](./WORKLOG_ARCHIVE.md)

## 版本索引

- 活跃轮次：
  - [`2026-04-11 第 36 轮`](#2026-04-11-第-36-轮)
  - [`2026-04-11 第 37 轮`](#2026-04-11-第-37-轮)
  - [`2026-04-14 第 38 轮`](#2026-04-14-第-38-轮)
- 近期关键节点：
  - `v0.1.5` 正式收口：见 [`docs/V015_CLOSEOUT.md`](./V015_CLOSEOUT.md)
  - `v0.1.5` 发布资产补齐：详见 [`docs/WORKLOG_ARCHIVE.md`](./WORKLOG_ARCHIVE.md)

> 旧轮次不再继续堆叠在本文档内。若需要回溯第 1 至第 35 轮，请查阅归档文档。

## 2026-04-11 第 36 轮

### 讨论主题

- 正式进入 `v0.20` 的实施规划与文档基线整理。

### 当前结论

- `v0.20` 采用“文档先行、实现后置”的推进方式。
- 本轮先统一优先级、更多条件、轻量批量操作、快捷操作强化、任务概览增强和系统级界面精修的边界。
- 当前阶段不纳入快速新建条、批量删除、日历主视图和服务端同步。

### 决策原因

- `v0.20` 是在 `v0.1.5` 已收口骨架上的稳健扩展，若不先写清边界，后续很容易在筛选、排序、批量模式和概览之间重新耦合。
- 统一验收清单能把“做到什么算完成”说清楚，减少后续回头补口径的成本。

### 文档更新

- 新增了 [`docs/V020_ACCEPTANCE.md`](./V020_ACCEPTANCE.md)，作为 `v0.20` 统一验收清单。
- 更新了 [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)，补齐 `v0.20` 的版本目标、纳入范围、责任边界和实施顺序。
- 更新了 [`docs/PROJECT_CONSTRAINTS.md`](./PROJECT_CONSTRAINTS.md)，补充 `v0.20` 的实施边界与文档先行约束。

### 实现记录

- 本轮只完成 `v0.20` 文档基线整理，不包含功能代码改动。

### 验证记录

- 本轮仅做文档更新，未执行构建验证。

### 下一步建议

- 按 [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md) 与 [`docs/V020_ACCEPTANCE.md`](./V020_ACCEPTANCE.md) 进入后续实现。

## 2026-04-11 第 37 轮

### 讨论主题

- 对 `v0.20` 做最后一次文档自洽修订，并清理文档结构债务。

### 当前结论

- `v0.20` 仍是唯一当前实施基线，本轮不改范围、不改行为验收口径。
- 将活跃架构与历史架构分离，避免当前基线与旧版本实施说明混在同一文档。
- 将活跃工作日志与历史工作日志分离，避免继续在单一 `WORKLOG.md` 中堆叠全部轮次。

### 决策原因

- 当前问题已经不是范围不清，而是文档可发现性和维护成本过高。
- 继续在原文件上小修小补，收益明显低于一次性完成结构拆分。

### 文档更新

- 新增了 [`docs/ARCHITECTURE_HISTORY.md`](./ARCHITECTURE_HISTORY.md)，集中保留 `v0.20` 之前的范围与阶段性方案摘要。
- 新增了 [`docs/WORKLOG_ARCHIVE.md`](./WORKLOG_ARCHIVE.md)，保留旧版完整工作日志快照。
- 重写了 [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)，只保留当前活跃基线。
- 重写了 [`docs/PROJECT_CONSTRAINTS.md`](./PROJECT_CONSTRAINTS.md)，只保留长期约束与当前指针。
- 重写了 [`docs/WORKLOG.md`](./WORKLOG.md)，只保留活跃轮次与归档入口。

### 实现记录

- 本轮只处理文档结构，不包含代码改动。

### 验证记录

- 已人工复查 `ARCHITECTURE / PROJECT_CONSTRAINTS / WORKLOG` 三份主文档的职责边界与交叉链接，确认当前基线与历史归档已分层。

### 下一步建议

- 文档结构债清理完成后，再进入 `v0.20` 的功能实现，不再把历史说明继续回填到活跃文档中。

## 2026-04-14 第 38 轮

### 讨论主题

- 进入 `v0.20` 的第一段实现，先落任务优先级模型与 SQLite 兼容迁移。

### 当前结论

- 任务模型已正式补入 `priority`，固定为 `urgent / high / medium / low`。
- 旧 SQLite 数据库升级时，若 `tasks` 表缺少 `priority`，会安全补列，并以 `medium` 作为默认值。
- 当前轮只打通优先级字段的模型、持久化和基础读写链路，不提前扩到复杂查询和批量接口。

### 决策原因

- `priority` 是后续更多条件、排序方式、批量操作和概览统计的共享基础字段，必须先把数据语义与兼容迁移做稳。
- 先完成最小闭环，可以避免在 Task 3 之前把查询条件和 UI 交互一起耦合进来。

### 文档更新

- 更新了 [`docs/WORKLOG.md`](./WORKLOG.md)，记录本轮优先级模型与数据库迁移落地结果。

### 实现记录

- 更新了 [src-tauri/src/models/mod.rs](E:/CodeBase/.worktrees/v020/src-tauri/src/models/mod.rs)，新增 Rust 侧 `TaskPriority` 枚举，并为任务创建/编辑输入接入 `priority`。
- 更新了 [src-tauri/src/db/mod.rs](E:/CodeBase/.worktrees/v020/src-tauri/src/db/mod.rs)，为旧库补充 `tasks.priority` 字段兼容迁移。
- 新增了 [src-tauri/src/db/tests.rs](E:/CodeBase/.worktrees/v020/src-tauri/src/db/tests.rs)，覆盖旧库补 `priority` 列与默认值回填。
- 更新了 [src-tauri/src/commands/tasks.rs](E:/CodeBase/.worktrees/v020/src-tauri/src/commands/tasks.rs)，让 `list_tasks / create_task / update_task` 接上 `priority` 的读写。
- 更新了 [src/features/tasks/task.types.ts](E:/CodeBase/.worktrees/v020/src/features/tasks/task.types.ts) 与 [src/features/tasks/task.storage.ts](E:/CodeBase/.worktrees/v020/src/features/tasks/task.storage.ts)，补齐前端共享类型和本地兜底存储链路。
- 更新了 [src/features/tasks/task.mock.ts](E:/CodeBase/.worktrees/v020/src/features/tasks/task.mock.ts)、[src/components/TaskComposer.tsx](E:/CodeBase/.worktrees/v020/src/components/TaskComposer.tsx) 和 [src/components/TaskList.tsx](E:/CodeBase/.worktrees/v020/src/components/TaskList.tsx)，做最小编译适配，不提前展开优先级 UI。

### 验证记录

- 使用 `cargo test init_database_adds_priority_column_to_legacy_tasks_table -- --nocapture` 验证旧库迁移测试，通过。
- 使用 `cargo check` 验证宿主层 Rust 编译，通过。
- 使用 `tsc -b` 验证前端 TypeScript 构建，通过。

### 下一步建议

- 继续进入 Task 3，把 `priority` 接到任务查询输入、更多条件与排序方式，但仍保持不碰批量删除和复杂快捷键边界。
