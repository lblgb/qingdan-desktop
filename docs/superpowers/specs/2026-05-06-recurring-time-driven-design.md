# v1.0 时间驱动周期任务设计

## 背景

v0.9 已经把周期任务独立为一套数据和界面，并放入任务清单中通过“普通任务 / 周期任务”切换查看。当前周期任务的核心动作是提交文字进展；v1.0 要把它升级为时间驱动：每个周期任务在每个周期内有固定目标分钟数，用户通过开始计时、停止计时生成时间记录，系统用时间记录计算完成情况。

## 目标

- 周期任务从“提交进展”改为“开始计时”。
- 每个周期任务配置“每周期目标分钟数”，例如每周 420 分钟。
- 每次计时结束生成一条时间记录，记录开始时间、结束时间、净计时分钟数和可选说明。
- 当前周期累计净计时分钟数达到目标分钟数即视为完成，允许超额完成。
- 任务概览展示全部周期任务当前周期的整体完成情况，以及每个周期任务的进度晾晒。
- 详情页按周期展示历史时间记录，并允许修改说明、删除记录。

## 非目标

- 不做后台系统托盘常驻计时。
- 不做跨设备同步。
- 不做番茄钟、自动休息或专注模式扩展。
- 不自动合并相邻时间记录。
- 不把周期任务和普通任务关联。
- 不把历史周期展开到任务概览中，历史只在详情里查看。

## 数据模型

### 周期任务

`recurring_tasks` 新增字段：

- `target_minutes_per_period INTEGER NOT NULL DEFAULT 420`

字段含义：

- 表示每个周期的固定目标分钟数。
- 新建周期任务必须填写，默认值为 420。
- 编辑周期任务可修改该值；修改后影响当前和后续周期的完成率计算，历史时间记录不变。

### 时间记录

新增 `recurring_time_entries`，替代新流程里的 `recurring_progress_entries`。

字段：

- `id TEXT PRIMARY KEY`
- `period_id TEXT NOT NULL`
- `started_at TEXT NOT NULL`
- `ended_at TEXT NOT NULL`
- `duration_minutes INTEGER NOT NULL`
- `note TEXT NOT NULL DEFAULT ''`
- `created_at TEXT NOT NULL`
- `updated_at TEXT NOT NULL`

约束：

- `duration_minutes` 使用分钟作为统一单位。
- `duration_minutes` 可以为 0，仅用于兼容迁移旧文字进展。
- 正常计时生成的新记录必须大于等于 1 分钟。
- 删除时间记录需要二次确认，因为会影响周期完成率。

### 旧进展兼容

旧 `recurring_progress_entries` 不再作为新入口使用。迁移时把旧文字进展转成 `recurring_time_entries`：

- `started_at = created_at`
- `ended_at = created_at`
- `duration_minutes = 0`
- `note = content`

这些记录在详情里作为历史说明展示，但不计入完成时间。

## 完成计算

当前周期完成分钟数：

```text
sum(recurring_time_entries.duration_minutes where period_id = current_period.id)
```

完成状态：

- `completed_minutes >= target_minutes_per_period`：本周期已达标。
- `completed_minutes < target_minutes_per_period`：本周期未达标。

展示指标：

- 已完成分钟数。
- 目标分钟数。
- 剩余分钟数：`max(target - completed, 0)`。
- 完成率：`completed / target`，允许超过 100%。

## 计时会话

开始计时不立即写正式时间记录，只创建前端运行会话状态。会话状态至少包含：

- `taskId`
- `periodId`
- `startedAt`
- `runningSince`
- `pausedAccumulatedMs`
- `isPaused`

交互规则：

- 点击“开始计时”打开全屏弹窗式专注计时器。
- 暂停/继续属于同一次会话，暂停时间不计入净时长。
- 点击“结束并记录”后计算净分钟数，并进入说明填写步骤。
- 不足 1 分钟的会话不生成正式记录。
- 点击“退出”时，如果净时长不足 1 分钟，直接退出；如果大于等于 1 分钟，询问保存或丢弃。
- 如果应用关闭或崩溃导致存在未结束会话，下次打开时提示恢复、保存到当前时间或丢弃。

## 周期任务列表

周期任务列表保留在任务清单中，通过“普通任务 / 周期任务”切换。

每个周期任务卡片展示：

- 任务标题和描述。
- 周期规则。
- 本周期范围。
- 目标分钟数、已完成分钟数、剩余分钟数。
- 完成率进度条。
- 状态标签：本周期已达标 / 还差 X 分钟。
- 最近一条时间记录说明。

按钮顺序：

1. 开始计时
2. 详情
3. 编辑
4. 删除

## 计时弹窗

计时弹窗使用全屏弹窗，不新增路由页面。

第一步：专注计时。

- 显示任务名。
- 显示当前周期范围。
- 显示目标、已完成、本次已计时。
- 提供暂停/继续。
- 提供结束并记录。
- 提供退出。

第二步：填写说明。

- 展示本次开始时间、结束时间、净分钟数。
- 提供说明输入框。
- 保存后生成时间记录并关闭弹窗。
- 说明允许为空，但应鼓励填写。

## 详情弹窗

详情弹窗顶部融合任务信息和本周期统计：

- 周期规则。
- 当前周期范围。
- 当前周期目标、已完成、剩余、完成率。
- 当前状态。

历史区按周期分组：

- 每个周期显示周期范围、目标、完成、完成率。
- 周期下展示时间记录列表。
- 每条时间记录展示时间段、净分钟数、说明。
- 说明可编辑。
- 记录可删除，删除前二次确认。

## 任务概览

任务概览新增“周期任务完成情况”区块。

顶部汇总当前周期：

- 周期任务数量。
- 总目标分钟数。
- 总完成分钟数。
- 总剩余分钟数。
- 整体完成率。
- 已达标任务数量。
- 未达标任务数量。

下方按周期任务晾晒：

- 任务名。
- 当前周期范围。
- 目标 / 已完成 / 剩余。
- 完成率进度条。
- 最近一条时间记录说明。
- 点击卡片进入详情。

任务概览只展示当前周期，不展开历史周期。

## 存储与命令边界

后端命令新增或替换：

- `list_recurring_time_entries(period_id)`
- `create_recurring_time_entry(input)`
- `update_recurring_time_entry_note(input)`
- `delete_recurring_time_entry(entry_id)`

现有周期任务命令继续保留：

- `list_recurring_tasks`
- `create_recurring_task`
- `update_recurring_task`
- `delete_recurring_task`
- `list_recurring_periods`

前端本地 fallback 也需要支持同样数据结构，保持桌面和浏览器测试环境一致。

## 测试要求

后端测试：

- 创建周期任务时保存目标分钟数。
- 迁移旧进展为 0 分钟时间记录。
- 创建时间记录后可按周期查询。
- 更新说明只改 note 和 updated_at。
- 删除时间记录会从周期统计中移除。
- 当前周期累计分钟数达到目标时视为完成。

前端单元测试：

- 周期任务列表显示目标、已完成、剩余和完成率。
- “开始计时”打开计时弹窗。
- 暂停/继续不计入净时长。
- 结束并记录创建时间记录。
- 详情按周期分组展示时间记录，并允许编辑说明。
- 概览展示全部周期任务当前周期汇总和任务晾晒。

构建验证：

- `npm test`
- `cargo test`
- `npm run build`
- 发布前执行 `npm run tauri:build`

## 发布要求

v1.0 发布时：

- 应用版本号统一为 `1.0.0`。
- Git tag 使用 `v1.0.0`。
- GitHub Release 必须上传 NSIS 和 MSI 两类 Windows 安装包。
