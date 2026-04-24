# 项目开发约束

## 文件说明

本文档记录长期有效的工程约束、发布要求和当前活跃版本指针。
版本历史、阶段性方案和详细讨论过程不在本文档展开，相关背景见：

- [`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
- [`docs/ARCHITECTURE_HISTORY.md`](./ARCHITECTURE_HISTORY.md)
- [`docs/WORKLOG.md`](./WORKLOG.md)
- [`docs/WORKLOG_ARCHIVE.md`](./WORKLOG_ARCHIVE.md)

## 当前活跃基线

- 当前活跃版本：`v0.50.0`
- 当前实施基线：[`docs/ARCHITECTURE.md`](./ARCHITECTURE.md)
- 当前手工验收清单：[`docs/V050_ACCEPTANCE.md`](./V050_ACCEPTANCE.md)
- 当前工作日志入口：[`docs/WORKLOG.md`](./WORKLOG.md)

> `v0.50.0` 继续执行“文档先行”原则。任何新增范围、验收项、实现边界或行为变化，都应先更新架构文档、验收文档或本文档，再进入代码实现。

## 长期规范约束

### 1. 对话与决策记录

- 项目内需要持续记录每一轮讨论中的关键信息。
- 记录内容至少包括：讨论主题、达成结论、主要原因、实现记录、验证记录和下一步建议。
- 默认维护 [`docs/WORKLOG.md`](./WORKLOG.md) 作为活跃工作日志；旧轮次归档到 [`docs/WORKLOG_ARCHIVE.md`](./WORKLOG_ARCHIVE.md)。

### 2. 中文优先

- 项目文档默认使用中文。
- 代码注释默认使用中文。
- 界面文案默认使用中文。

### 3. 注释规范

- 每个源码文件文件头需要包含简要注释，说明该文件用途。
- 结构体、类型定义和核心函数需要保留简要注释。
- 对复杂逻辑可按需补充说明性注释，但要避免无信息量的重复描述。

### 4. 功能完成后的版本同步

- 每个明确功能完成后，应形成独立提交。
- 提交完成后，应同步推送到 GitHub 远端仓库。
- 若某个功能较大，应拆分为多个可验证的小提交，而不是一次性堆叠。

### 5. 产品与工程基线

- 产品继续保持“本地优先的桌面待办工具”定位。
- 当前实施版本是 `v0.50.0`，不得回头修改已收口版本边界。
- 任务组仍是附加属性，不替代主状态。
- 一个任务最多属于一个任务组。

### 6. 可扩展性要求

- 目录结构需要清晰，避免页面逻辑、状态管理和数据访问混杂。
- 功能模块应尽量解耦，便于后续增加提醒、统计、同步等能力。
- 数据模型设计需要考虑后续扩展字段，而不是只满足最小可跑。
- 需要提前定义基础约定，例如状态流转、数据存储层边界和桌面能力调用边界。

### 7. 编码与配置文件约束

- 文本配置文件统一使用 UTF-8 无 BOM，尤其是 `Cargo.toml`、`tauri.conf.json` 等会被构建工具直接解析的文件。
- 涉及 Tauri Windows 构建时，必须保证 `src-tauri/icons` 下存在有效图标资源。
- 涉及 Tauri 发布配置时，必须显式配置产品名、窗口标题和 `bundle.icon`。
- Windows 发布版应使用 `windows_subsystem = "windows"`，避免安装版启动时弹出额外控制台窗口。
- 环境问题排查时，应优先区分“系统依赖问题”和“项目配置问题”，避免混杂处理。

### 8. GitHub Release 交付要求

- GitHub Release 不能只包含 tag 和发布说明。
- Windows 正式发布时，默认必须同时附带两类安装产物：
  - `轻单_<version>_x64-setup.exe`
  - `轻单_<version>_x64_zh-CN.msi`
- GitHub Release 若将中文前缀规整为下划线，发布页资产名应至少保留为：
  - `_<version>_x64-setup.exe`
  - `_<version>_x64_zh-CN.msi`
- 若某次发布缺失上述任一安装产物，或版本号不一致，应视为发布内容不完整。
- 发布前应核对 tag、release notes、安装包文件名和应用内部版本号一致。

## 当前阶段说明

- `v0.1.5` 已正式收口，收口文档见 [`docs/V015_CLOSEOUT.md`](./V015_CLOSEOUT.md)。
- `v0.50.0` 是唯一有效的当前实施基线。
- 若需要回溯 `v0.1.5` 或更早阶段的范围与设计语义，应查阅 [`docs/ARCHITECTURE_HISTORY.md`](./ARCHITECTURE_HISTORY.md) 和 [`docs/WORKLOG_ARCHIVE.md`](./WORKLOG_ARCHIVE.md)。

## 变更原则

- 新约束在讨论确认后，应直接更新本文档。
- 如新决策与旧约束冲突，应显式标注覆盖关系，而不是隐式替换。
- 本文档只保留长期有效规则与当前指针，不追加版本级实现流水账。
