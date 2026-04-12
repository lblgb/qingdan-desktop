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
