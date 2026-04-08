# 项目工作日志

## 文件说明

本文档用于按轮次记录项目讨论、阶段性决策、问题定位结果、修复动作和后续待办，作为后续开发与回顾依据。

## 2026-04-05 第 1 轮
### 讨论主题

- 桌面端待办软件的产品方向和第一版范围。

### 当前结论

- 项目先做桌面端待办软件第一版。
- 第一版优先做本地可用版本，不先引入登录和多人协作。
- 工程设计需要从一开始就为后续扩展预留空间。

### 决策原因

- 待办软件的核心价值首先在于录入效率、查看效率和提醒可靠性。
- 先做本地可用版本可以降低复杂度，更快验证交互和结构设计是否合理。
- 预留扩展能力可以避免后续增加标签、提醒、同步时出现大规模返工。

### 待确认事项

- 技术栈最终选择。
- 第一版功能边界和优先级。

## 2026-04-05 第 2 轮
### 讨论主题

- 项目开发约束、注释规范、记录方式和 GitHub 同步要求。

### 当前结论

- 每轮对话和决策都需要在项目内留痕记录。
- 项目文档、界面文案和代码注释默认使用中文。
- 每个源码文件文件头需要包含简要说明。
- 结构体、类型定义和核心函数需要保留简要注释。
- 每个小功能完成后需要形成独立提交，并同步到 GitHub。

### 决策原因

- 将约束写入仓库比依赖会话记忆更稳定，也更利于后续维护。
- 中文文档和注释更符合当前协作方式。
- 独立提交有利于回溯问题、评审和按功能推进。

### 待确认事项

- GitHub 仓库地址和首次推送方式。
- 后续是否拆分为开发规范文档与决策日志文档。

## 2026-04-05 第 3 轮
### 讨论主题

- Tauri 技术栈中的 Rust 成本与可接受性。

### 当前结论

- 项目采用 `Tauri + React + TypeScript`。
- Tauri 的宿主层与原生能力桥接基于 Rust。
- 第一版功能虽然以前端为主，但后续桌面能力扩展和排障仍需要具备 Rust 维护能力。

### 决策原因

- 技术栈判断需要基于真实底层实现，而不是只看前端部分。
- 提前明确 Rust 成本，有利于后续在团队能力和目标之间做更清晰的取舍。

### 待确认事项

- 状态管理方案、UI 方案和数据库接入方式。
- Tauri 项目初始化方式和目录结构。

## 2026-04-05 第 4 轮
### 讨论主题

- 项目骨架初始化与阶段性技术方案落地。

### 当前结论

- 已生成 `Vite + React + TypeScript` 前端骨架，并按待办项目方向重构目录结构。
- 已接入 `Zustand`、`Zod`、`dayjs` 和 Tauri 侧依赖。
- 已创建 `src-tauri` 目录和宿主层基础结构。
- 第一版数据持久化当前先用 `localStorage` 占位，后续切换到 `Tauri + SQLite`。

### 决策原因

- 在宿主层环境未完全就绪前，先完成前端和目录结构可以保持整体推进节奏。
- 使用 `localStorage` 占位可以更快验证第一版任务流和状态组织方式。
- 先明确 `src-tauri` 结构，有利于后续平滑接入数据库、命令层和桌面能力。

### 待确认事项

- GitHub 远端仓库地址。
- SQLite 正式接入时的数据迁移策略。

## 2026-04-06 第 5 轮
### 讨论主题

- Windows 下 Tauri 开发环境诊断、宿主层构建修复与桌面程序拉起验证。

### 当前结论

- Rust、Cargo 与 Visual Studio Build Tools 已恢复到可用状态，`tauri info` 通过。
- `src-tauri/Cargo.toml` 存在编码/内容损坏，已重写为合法 TOML。
- `src-tauri/tauri.conf.json` 存在 UTF-8 BOM，导致 Tauri 构建脚本无法解析，已转为无 BOM UTF-8。
- Windows 资源构建缺少 `src-tauri/icons/icon.ico`，已补充最小可用图标资源。
- `npm run tauri:dev` 已可启动，`qingdan-desktop.exe` 与 `msedgewebview2` 已运行，桌面窗口已成功显示。

### 决策原因

- 先用 `tauri info` 验证环境，再逐层排除项目配置问题，可以避免系统环境与项目配置混杂。
- Rust 构建日志显示失败点集中在配置文件解析和图标资源缺失，优先修复这类硬阻塞项最有效。
- 在应用进程、WebView 进程和本地开发端口均正常后，才能确认问题已经从“无法启动”切换为“可进入 UI 打磨阶段”。

### 修复记录

- 修复了 [src-tauri/Cargo.toml](E:/CodeBase/src-tauri/Cargo.toml) 的 TOML 损坏问题。
- 修复了 [src-tauri/tauri.conf.json](E:/CodeBase/src-tauri/tauri.conf.json) 的 BOM 编码问题。
- 新增了 [src-tauri/icons/icon.ico](E:/CodeBase/src-tauri/icons/icon.ico) 和 [src-tauri/icons/icon.png](E:/CodeBase/src-tauri/icons/icon.png) 作为当前可用图标资源。
- 验证了 [src-tauri/target/debug/qingdan-desktop.exe](E:/CodeBase/src-tauri/target/debug/qingdan-desktop.exe) 可生成并运行。

### 当前风险

- 当前窗口虽然已能显示，但 UI 质量仍处于骨架阶段，视觉层级、布局精度和品牌感不足。
- 新补的图标仅用于打通 Windows 构建链路，后续需要替换为正式品牌图标资源。
- 文档曾出现编码损坏，后续编辑时需要统一使用 UTF-8 无 BOM，避免 Tauri/Rust 再次解析失败。

### 下一步建议

- 重启会话后启用新的 UI/UX skill，优先改造首页视觉层次、任务列表密度和交互反馈。
- 在 UI 调整前，先明确第一版核心页面结构和组件风格基线，避免返工。
- UI 稳定后，再推进 SQLite 正式接入和 Tauri 命令层从占位实现切换到真实数据流。

## 2026-04-07 第 6 轮
### 讨论主题

- 首页 UI/UX 第一轮正式改造、前端构建验证与桌面端再次启动确认。

### 当前结论

- 已基于新接入的 `ui-ux-pro-max` skill 完成首页第一轮视觉重构。
- 首页从“骨架展示页”切换为“桌面任务工作台”结构，包含顶部品牌区、阶段说明、统计卡片、筛选侧栏和更紧凑的任务内容区。
- 当前仍保持 `localStorage` 占位数据流，未改动任务状态逻辑与数据边界。
- `tsc -b` 通过，`npm.cmd run build` 通过，前端生产构建可完成。

### 决策原因

- 当前阶段主线已经从“环境修复”切换到“体验打磨”，优先级应放在视觉层级、信息密度和交互反馈，而不是先扩展数据层。
- 待办工具属于高频使用界面，首页如果仍停留在演示骨架，会直接拖累后续真实数据层接入时的判断效率。
- 在未改动状态仓库和数据存储边界的前提下先做展示层重构，可以降低返工风险。

### 改动记录

- 重构了 [src/app/AppShell.tsx](E:/CodeBase/src/app/AppShell.tsx) 的首页信息架构，新增顶部品牌区、阶段说明、完成率/逾期提醒等概览信息，以及带数量的筛选侧栏。
- 重构了 [src/components/TaskComposer.tsx](E:/CodeBase/src/components/TaskComposer.tsx) 的任务录入区域，优化文案、表单标签关联和录入提示。
- 重构了 [src/components/TaskList.tsx](E:/CodeBase/src/components/TaskList.tsx) 的任务列表样式与空状态，强化“标记完成/删除”的操作可见性。
- 重写了 [src/index.css](E:/CodeBase/src/index.css) 的全局样式，建立新的桌面工作台视觉基线，并补充了 `prefers-reduced-motion` 响应。

### 验证记录

- 使用 `cmd /c node_modules\\.bin\\tsc.cmd -b` 验证 TypeScript 构建，通过。
- 使用 `cmd /c npm.cmd run build` 验证前端生产构建，通过。
- 沙箱内直接执行 Vite 构建时曾出现 `spawn EPERM`，切换到沙箱外构建后通过，说明问题来自执行权限环境而非前端代码本身。

### 当前风险

- 当前改造仍聚焦首页工作台，不包含任务排序、优先级标签、拖拽或真实数据库接入。
- 逾期判断当前基于前端本地时间和 `dueAt` 字段做简单比较，后续若接入 SQLite 需要统一时间语义。
- 正式品牌图标仍未替换，当前图标资源仍属于占位方案。

### 下一步建议

- 继续推进第二轮界面细化，优先处理任务排序规则、逾期优先级表现和筛选反馈强化。
- 在界面结构稳定后，开始把 `localStorage` 占位实现切换为 `Tauri + SQLite` 的真实数据流。
- 在进入打包发布前，补齐正式品牌图标资源并替换当前占位图标。

## 2026-04-07 第 7 轮
### 讨论主题

- 按文档约束推进真实数据层第一阶段接入，并明确本轮实现范围。

### 当前结论

- 本轮已先更新文档，再按文档基准实现 `Tauri 命令层 + SQLite` 的第一阶段接入。
- 第一阶段只覆盖与当前界面等价的基础持久化能力：读取、新建、完成/取消完成、删除。
- 排序、分组、编辑、标签、优先级和数据迁移仍明确不在本轮范围内。
- 前端 `localStorage` 已从主实现降级为非 Tauri 环境的回退方案，桌面端主数据源切换为 SQLite。

### 决策原因

- 如果在真实数据层接入时同时引入排序、分组和编辑语义，会让数据边界、查询口径和界面改造交叉耦合，返工风险过高。
- 当前界面已经具备基础任务流，优先做“能力对齐”的真实持久化接入，可以更稳地验证 Tauri 命令边界和宿主层结构。
- 先把文档作为基准补齐，有助于后续继续按范围推进，而不是在实现中隐式扩张。

### 文档更新

- 更新了 [docs/ARCHITECTURE.md](E:/CodeBase/docs/ARCHITECTURE.md)，新增“真实数据层接入范围”，明确第一阶段目标、包含项、不包含项与验收基线。
- 更新了 [docs/PROJECT_CONSTRAINTS.md](E:/CodeBase/docs/PROJECT_CONSTRAINTS.md)，补充当前阶段实现边界，要求先更新文档再推进功能实现。

### 实现记录

- 在 [src-tauri/src/db/mod.rs](E:/CodeBase/src-tauri/src/db/mod.rs) 中实现了 SQLite 文件初始化、任务表建表与数据库连接能力。
- 在 [src-tauri/src/models/mod.rs](E:/CodeBase/src-tauri/src/models/mod.rs) 中补充了 Rust 侧 `TaskItem` 与 `CreateTaskInput` 数据结构，并统一为前端友好的 camelCase 序列化语义。
- 新增了 [src-tauri/src/commands/tasks.rs](E:/CodeBase/src-tauri/src/commands/tasks.rs)，提供 `list_tasks`、`create_task`、`toggle_task`、`delete_task` 四个任务命令。
- 更新了 [src-tauri/src/lib.rs](E:/CodeBase/src-tauri/src/lib.rs)，在应用启动时初始化数据库并注册任务命令。
- 更新了 [src/features/tasks/task.storage.ts](E:/CodeBase/src/features/tasks/task.storage.ts)，将任务数据访问切换为“桌面端走 Tauri 命令，浏览器环境回退 localStorage”的模式。
- 更新了 [src/stores/taskStore.ts](E:/CodeBase/src/stores/taskStore.ts)，将任务仓库改为异步加载和异步变更。
- 更新了 [src/app/AppShell.tsx](E:/CodeBase/src/app/AppShell.tsx)、[src/components/TaskComposer.tsx](E:/CodeBase/src/components/TaskComposer.tsx)、[src/components/TaskList.tsx](E:/CodeBase/src/components/TaskList.tsx)，联调异步加载后的界面行为。
- 更新了 [src-tauri/Cargo.toml](E:/CodeBase/src-tauri/Cargo.toml)，补充 SQLite 与任务主键/时间戳所需的宿主层依赖。

### 验证记录

- 使用 `cmd /c node_modules\\.bin\\tsc.cmd -b` 验证前端 TypeScript 构建，通过。
- 使用 `cargo check` 验证宿主层 Rust 编译，通过。
- Rust 校验在沙箱环境内无法正常启动，切换到沙箱外执行后通过，说明问题来自环境限制而非代码本身。

### 当前风险

- 当前任务查询顺序仍属于第一阶段临时口径，仅用于让桌面端真实数据流稳定可用，还不是最终排序策略。
- SQLite 已接入，但尚未实现从历史 `localStorage` 自动迁移到数据库的逻辑。
- 当前界面未显式暴露数据层错误提示，若命令层后续返回异常，仍需要补齐用户可见反馈。

### 下一步建议

- 重启并验证桌面端真实数据链路，确认新增、完成、删除在应用重启后仍可保留。
- 在第一阶段稳定后，单独设计排序与分组语义，再进入第二阶段数据查询能力扩展。
- 后续如要补任务编辑，应先明确更新命令接口、前端交互入口和验收标准，再推进实现。

## 2026-04-07 第 8 轮
### 讨论主题

- 在真实数据层第一阶段稳定后，先收敛任务排序与分组的规则文档，再进入第二阶段实现。

### 当前结论

- 排序与分组不属于单纯 UI 调整，而是任务查询语义的一部分，应先文档化再实现。
- 第一版默认展示口径确定为：进行中优先、已设截止日期优先、截止日期升序、更新时间倒序、已完成沉底。
- 第一版分组语义确定为：`已逾期 / 今天 / 未来 / 未安排`，已完成任务不参与时间分组。
- 第二阶段先由命令层返回已排序的扁平列表，分组结构先在前端计算，不急于把视图组织责任下沉到宿主层。

### 决策原因

- 排序和分组一旦进入实现而没有口径文档，后续很容易在前端、命令层和视觉表现之间出现语义漂移。
- 当前已有字段只够支撑时间分层和完成状态分层，强行引入标签或优先级分组会让模型和交互一起膨胀。
- 先让命令层负责稳定排序、前端负责轻量分组，能在复杂度和一致性之间取得更稳妥的平衡。

### 文档更新

- 更新了 [docs/ARCHITECTURE.md](E:/CodeBase/docs/ARCHITECTURE.md)，新增“任务排序与分组语义”章节，明确设计目标、默认展示口径、分组判定规则、责任边界和第二阶段验收基线。

### 当前风险

- 当前“今天 / 逾期 / 未来”的判定依赖本地日期语义，后续需要在前端与宿主层实现中保持一致的日期边界处理。
- 第二阶段若需要支持编辑任务或更复杂的筛选，可能需要重新审视当前扁平列表 + 前端分组的边界是否仍然合适。

### 下一步建议

- 进入第二阶段实现时，先调整命令层查询顺序以匹配文档中的默认排序口径。
- 在前端新增统一的任务分组函数，并确保 `全部任务` 与 `进行中` 视图共享同一套分组规则。
- 等排序与分组稳定后，再决定是否进入任务编辑能力或更复杂的查询视图扩展。

## 2026-04-07 第 9 轮
### 讨论主题

- 按既定文档基线实现第二阶段的任务排序与分组能力。

### 当前结论

- 命令层默认排序已调整为与文档一致：进行中优先、已设截止日期优先、截止日期升序、更新时间倒序、已完成沉底。
- 前端已新增统一的时间语义分组函数，`全部任务` 与 `进行中` 视图可按 `已逾期 / 今天 / 未来 / 未安排` 展示。
- `已完成` 视图保持单组列表，不参与时间分组。
- 第二阶段仍未引入新的任务字段，也未把分组结构下沉到命令层。

### 决策原因

- 先让命令层稳定输出“排序一致的扁平列表”，可以减少前端在不同视图下自己维护排序的漂移风险。
- 分组暂留在前端计算，便于继续快速调整展示结构，同时避免过早把视图语义固化到宿主层接口。
- 保持字段模型不变，可以验证当前数据结构是否足以支撑第一版时间语义工作流。

### 实现记录

- 更新了 [src-tauri/src/commands/tasks.rs](E:/CodeBase/src-tauri/src/commands/tasks.rs)，使 SQLite 查询顺序与文档中的默认排序口径一致。
- 新增了 [src/features/tasks/task.grouping.ts](E:/CodeBase/src/features/tasks/task.grouping.ts)，统一封装任务分组规则与组元信息。
- 更新了 [src/components/TaskList.tsx](E:/CodeBase/src/components/TaskList.tsx)，将列表渲染切换为按组展示。
- 更新了 [src/index.css](E:/CodeBase/src/index.css)，补充分组标题、分组计数和分组列表的样式表现。

### 验证记录

- 使用 `cmd /c node_modules\\.bin\\tsc.cmd -b` 验证前端 TypeScript 构建，通过。
- 使用 `cargo check` 验证宿主层编译，通过。
- 当前 [qingdan-desktop](E:/CodeBase/src-tauri/target/debug/qingdan-desktop.exe) 进程仍在运行，便于直接观察分组效果。

### 当前风险

- 逾期与今天的判定当前仍依赖前端本地日期语义，后续若宿主层需要承担更多查询职责，需保证同一套日期边界实现。
- 当前分组仅是展示层组织，筛选与统计仍围绕扁平列表工作，后续若增加折叠交互仍需补状态设计。
- 目前未增加错误提示与加载占位的细化表现，异步查询失败时的用户反馈仍偏弱。

### 下一步建议

- 先观察当前分组展示是否满足日常任务决策需求，再决定是否进入任务编辑能力。
- 如果分组口径基本稳定，可继续补“已完成任务折叠 / 展开”或“排序方式显式提示”这类轻量增强。
- 若发现时间语义仍不足以支撑使用场景，再评估是否引入优先级字段，而不是继续在现有字段上堆复杂规则。

## 2026-04-08 第 10 轮
### 讨论主题

- 继续按第一版功能范围补齐任务编辑能力，并先文档化本轮交付边界。

### 当前结论

- 当前最适合继续推进的是“任务编辑”，因为它已经在第一版功能范围内，但尚未落地。
- 本轮只做列表内联编辑，覆盖标题、备注、截止日期三个已有字段。
- 本轮不做弹窗、详情页、批量编辑或撤销机制，避免交互和状态复杂度同步膨胀。

### 决策原因

- 真实数据层、排序和分组已经基本稳定，继续补编辑能力能让第一版的任务闭环更完整。
- 列表内联编辑对现有界面侵入最小，也最符合当前桌面工作台的高频操作场景。
- 先把范围写清楚，可以避免编辑能力在实现过程中隐式扩张成新的页面流程。

### 文档更新

- 更新了 [docs/ARCHITECTURE.md](E:/CodeBase/docs/ARCHITECTURE.md)，新增“任务编辑接入范围”章节，明确本轮目标、包含项、不包含项与交互基线。

### 下一步建议

- 先在命令层和前端数据访问层补齐编辑接口，再把列表内联编辑接到现有分组列表中。

## 2026-04-08 第 11 轮
### 讨论主题

- 按文档基线落地任务编辑能力，补齐第一版功能闭环。

### 当前结论

- 任务编辑能力已接通，当前采用列表内联编辑方式。
- 本轮支持修改标题、备注和截止日期，保存后会回写 SQLite，并继续复用当前排序与分组口径。
- 同一时刻仅允许一条任务进入编辑态，编辑中提供明确的“保存 / 取消”动作。

### 决策原因

- 列表内联编辑对现有工作台结构侵入最小，适合当前高频、小步修改的待办场景。
- 在不新增字段和页面路由的前提下补齐编辑能力，可以让第一版核心任务流更完整。
- 保持编辑后重新走现有排序和分组，有助于验证当前查询语义是否真正可支撑日常使用。

### 实现记录

- 更新了 [src/features/tasks/task.types.ts](E:/CodeBase/src/features/tasks/task.types.ts)，新增前端 `UpdateTaskInput` 类型。
- 更新了 [src-tauri/src/models/mod.rs](E:/CodeBase/src-tauri/src/models/mod.rs)，补充 Rust 侧编辑输入模型。
- 更新了 [src-tauri/src/commands/tasks.rs](E:/CodeBase/src-tauri/src/commands/tasks.rs)，新增 `update_task` 命令。
- 更新了 [src-tauri/src/lib.rs](E:/CodeBase/src-tauri/src/lib.rs)，注册任务编辑命令。
- 更新了 [src/features/tasks/task.storage.ts](E:/CodeBase/src/features/tasks/task.storage.ts)，补充桌面端与浏览器回退环境下的编辑能力。
- 更新了 [src/stores/taskStore.ts](E:/CodeBase/src/stores/taskStore.ts)，将编辑操作纳入异步状态仓库。
- 更新了 [src/components/TaskList.tsx](E:/CodeBase/src/components/TaskList.tsx)，接入列表内联编辑交互。
- 更新了 [src/index.css](E:/CodeBase/src/index.css)，补充编辑态所需样式。

### 验证记录

- 使用 `cmd /c node_modules\\.bin\\tsc.cmd -b` 验证前端 TypeScript 构建，通过。
- 使用 `cargo check` 验证宿主层编译，通过。

### 当前风险

- 当前编辑态仍是单条任务的本地组件状态，后续若要支持跨视图编辑或更复杂的撤销行为，需要重新设计编辑状态边界。
- 编辑失败时当前尚未提供显式错误提示，只能依赖控制台和状态恢复。

### 下一步建议

- 重启桌面应用并验证编辑后的任务在应用重启后仍能保留。
- 如果编辑体验基本稳定，可继续补充更细的加载/错误反馈，而不是马上扩展更多任务字段。
