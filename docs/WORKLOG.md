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

## 2026-04-09 第 12 轮

### 讨论主题

- 进入第一版收口阶段，先补齐用户可见反馈，再做正式构建验证与发布前风险记录。

### 当前结论

- 当前界面已补齐最小可用的加载中、保存中、成功和失败反馈。
- 首页在任务读取阶段会显示加载提示；若初始化失败，会给出显式错误信息和重试入口。
- 新建任务时录入区会显示“保存中”状态并禁用表单，避免重复提交。
- 编辑、完成、删除任务时，列表区会显示对应的进行中提示，操作结束后会给出成功或失败反馈。
- `tsc -b` 已通过，`cargo check` 已通过。
- `tauri build` 已完成前端生产构建和宿主层 release 编译，并生成 `src-tauri/target/release/qingdan-desktop.exe`。
- Windows MSI 打包阶段当前阻塞在 WiX 工具链下载，不是项目代码编译错误。

### 决策原因

- 第一版当前缺的不是新字段，而是异步链路缺少用户可见反馈，会直接影响日常使用体验。
- 先把反馈补齐，再做正式构建验证，可以更准确地区分“交互可用性问题”和“发布链路问题”。
- 把 WiX 下载阻塞单独记录出来，能避免后续把外部依赖问题误判成 Tauri 或业务代码问题。

### 文档更新

- 更新了 [docs/ARCHITECTURE.md](E:/CodeBase/docs/ARCHITECTURE.md)，新增“第一版收口范围”，明确本轮目标、包含项、非范围项与验收基线。
- 重写并更新了 [docs/PROJECT_CONSTRAINTS.md](E:/CodeBase/docs/PROJECT_CONSTRAINTS.md)，补充第一版收口阶段约束，以及 Windows MSI 首次打包依赖 WiX 下载的说明。

### 实现记录

- 更新了 [src/stores/taskStore.ts](E:/CodeBase/src/stores/taskStore.ts)，补充异步动作态、加载态与统一反馈信息。
- 更新了 [src/app/AppShell.tsx](E:/CodeBase/src/app/AppShell.tsx)，接入首页状态提示条和初始化失败后的重试入口。
- 更新了 [src/components/TaskComposer.tsx](E:/CodeBase/src/components/TaskComposer.tsx)，补充新建任务的提交中反馈和禁用态。
- 更新了 [src/components/TaskList.tsx](E:/CodeBase/src/components/TaskList.tsx)，补充编辑、完成、删除动作的过程提示。
- 更新了 [src/index.css](E:/CodeBase/src/index.css)，补充状态提示条、内联反馈和禁用态样式。

### 验证记录

- 使用 `cmd /c node_modules\\.bin\\tsc.cmd -b` 验证前端 TypeScript 构建，通过。
- 使用 `cargo check` 验证宿主层编译，通过。
- 使用 `cmd /c npm.cmd run tauri:build` 进行正式构建验证，前端生产构建与 Rust release 编译通过。
- `tauri build` 日志显示当前阻塞点为 `Downloading https://github.com/wixtoolset/wix3/releases/download/wix3141rtm/wix314-binaries.zip`。

### 当前风险

- 第一版虽然已补齐最小可用反馈，但还没有做完整的手工验收清单。
- Windows 安装包产物仍未最终生成，当前只能确认 release 可执行文件已生成，不能确认 MSI 完整打包链路。
- 正式品牌图标仍未替换，当前图标资源仍属于占位方案。

### 下一步建议

- 继续做一轮手工验收，重点验证新增、编辑、完成、删除在重启后的保留情况，以及失败反馈是否符合预期。
- 网络链路稳定后重新执行 `tauri build`，完成 WiX 下载和 MSI 安装包验证。
- 第一版收口完成后，再决定是否进入图标替换和发布整理。

## 2026-04-09 第 13 轮

### 讨论主题

- 继续做第一版发布侧收口，补齐 Tauri 发布配置中的显式产品信息和图标引用。

### 当前结论

- `src-tauri/tauri.conf.json` 已补齐显式的产品名、窗口标题和 `bundle.icon` 配置。
- 发布配置现在明确引用 `icons/icon.ico` 与 `icons/icon.png`，不再依赖空数组。
- `tsc -b` 已通过，`cargo check` 已通过，说明这轮配置修正没有打断现有构建链路。

### 决策原因

- 即使当前图标仍是占位资源，也应先把发布配置接稳，避免后续发布产物继续依赖默认值或空配置。
- 产品名、窗口标题和图标引用属于发布侧基线信息，应该显式受版本管理，而不是隐含在环境或工具默认行为里。

### 文档更新

- 更新了 [docs/ARCHITECTURE.md](E:/CodeBase/docs/ARCHITECTURE.md)，在第一版收口范围中补充发布配置显式化要求。
- 更新了 [docs/PROJECT_CONSTRAINTS.md](E:/CodeBase/docs/PROJECT_CONSTRAINTS.md)，新增 Tauri 发布配置需显式配置产品名、窗口标题和 `bundle.icon` 的约束。

### 实现记录

- 重写了 [src-tauri/tauri.conf.json](E:/CodeBase/src-tauri/tauri.conf.json)，补齐发布配置中的产品名、窗口标题和图标引用。

### 验证记录

- 使用 `cmd /c node_modules\\.bin\\tsc.cmd -b` 验证前端 TypeScript 构建，通过。
- 使用 `cargo check` 验证宿主层编译，通过。

### 当前风险

- 当前图标资源仍是占位图标，本轮只解决“配置显式化”，未解决“品牌资源正式化”。
- PowerShell 终端输出中文配置时仍可能出现乱码，后续排查配置内容时需继续以构建结果为准，不要只看终端显示。

### 下一步建议

- 继续做第一版手工验收，验证当前 release 配置下的窗口标题和图标实际表现。
- 条件允许时重新执行 `tauri build`，在 WiX 下载成功后完成 MSI 安装包验证。
- 如需进一步收口发布质量，下一步应优先替换正式品牌图标，而不是继续增加新功能。

## 2026-04-09 第 14 轮

### 讨论主题

- 把第一版手工验收基线正式文档化，并补一次当前窗口启动状态验证。

### 当前结论

- 已新增第一版统一手工验收清单，后续收口将以该清单为准执行和勾选。
- 当前 `qingdan-desktop` 进程正在运行，主窗口标题验证为“轻单”。
- 本轮不继续扩功能，只补验收基线与当前验证记录，确保第一版收口口径稳定。

### 决策原因

- 当前项目已进入发布前收口阶段，缺的不是新的需求拆分，而是稳定、可复用的验收口径。
- 把验收项从工作日志里抽出来单独沉淀，能避免后续每轮收口都重新口头组织测试范围。

### 文档更新

- 新增了 [docs/V1_ACCEPTANCE.md](E:/CodeBase/docs/V1_ACCEPTANCE.md)，作为第一版统一手工验收清单。
- 更新了 [docs/ARCHITECTURE.md](E:/CodeBase/docs/ARCHITECTURE.md)，明确第一版手工验收以该清单为准。
- 更新了 [docs/PROJECT_CONSTRAINTS.md](E:/CodeBase/docs/PROJECT_CONSTRAINTS.md)，补充“验收需落到统一清单”的约束。

### 验证记录

- 使用进程检查确认 `qingdan-desktop` 正在运行。
- 当前 `MainWindowTitle` 验证结果为“轻单”。

### 当前风险

- 验收清单虽然已建立，但多数任务流项仍需你在真实窗口中逐项手工勾验。
- 当前只能确认窗口标题已生效，图标表现和完整任务流仍待人工确认。

### 下一步建议

- 直接按 [docs/V1_ACCEPTANCE.md](E:/CodeBase/docs/V1_ACCEPTANCE.md) 跑一轮手工验收。
- 你边验边把看到的问题发我，我按清单项逐条收口。

## 2026-04-09 第 15 轮

### 讨论主题

- 为确认“初次加载任务时可见加载反馈”这一项，临时加入可见延迟进行验收后再恢复正式代码。

### 当前结论

- 已通过临时加入 3 秒加载延迟的方式，确认首页初次加载反馈可以被用户明确看到。
- 验收完成后，临时代码已经移除，不进入正式版本。
- 第一版统一验收清单中的“初次加载任务时可见加载反馈”已标记为通过。

### 决策原因

- 本地 SQLite 读取过快，正常情况下加载提示往往一闪而过，不适合作为稳定的肉眼验收方式。
- 通过临时可控延迟放大反馈窗口，再在验收完成后回退，是当前最稳妥且不污染正式代码的做法。

### 文档更新

- 更新了 [docs/V1_ACCEPTANCE.md](E:/CodeBase/docs/V1_ACCEPTANCE.md)，将“初次加载任务时可见加载反馈”标记为已验证，并补充说明该项通过临时延迟方式确认。

### 验证记录

- 临时将首次 `hydrate` 延迟调至 3 秒，重启开发窗口后确认加载反馈可见。
- 验收完成后已移除延迟，并重新通过 `tsc -b` 验证代码恢复正常。

### 当前风险

- 该项虽已通过，但其可见性依赖真实环境速度；正式版本中加载提示是否肉眼可见，仍受机器性能影响。
- 其余反馈项和任务流项仍需继续按统一清单逐项确认。

### 下一步建议

- 继续按 [docs/V1_ACCEPTANCE.md](E:/CodeBase/docs/V1_ACCEPTANCE.md) 验收“新建保存中反馈”“编辑/完成/删除过程反馈”“成功/失败提示”等条目。
- 如你继续在窗口里验，我就按你的反馈逐条收口并同步文档。

## 2026-04-09 第 16 轮

### 讨论主题

- 根据本轮完整手工验收结果，统一更新第一版验收清单状态。

### 当前结论

- 除 MSI 安装包打包外，第一版当前所有手工验收项均已通过。
- 当前剩余阻塞已收敛为两类：WiX 下载导致的 MSI 打包未完成，以及正式品牌图标尚未替换。
- 第一版功能、交互、排序分组、持久化和反馈链路可以视为当前阶段已收口。

### 决策原因

- 既然你已经在真实窗口中把其余条目全部验过，就应该把验收清单同步到最终状态，而不是继续保留过时的未勾选项。
- 将阻塞项明确收敛到 MSI 打包和正式图标，有利于后续决定是先做发布链路，还是先做品牌资源替换。

### 文档更新

- 更新了 [docs/V1_ACCEPTANCE.md](E:/CodeBase/docs/V1_ACCEPTANCE.md)，将除 MSI 打包外的验收项全部标记为通过。

### 当前风险

- MSI 安装包仍未完成最终验证，当前只能确认 release 可执行文件已生成。
- 当前图标虽然配置已生效，但仍是占位资源，不代表最终品牌交付质量。

### 下一步建议

- 网络允许时重新执行 `tauri build`，优先完成 MSI 打包验证。
- 如果你想先处理视觉交付，再做正式品牌图标替换。

## 2026-04-09 第 17 轮

### 讨论主题

- 优先把 Windows 可安装产物打出来，而不是继续停留在 release 可执行文件阶段。

### 当前结论

- Windows 安装包链路已经打通。
- 当前成功生成了两个可分发产物：
  - `MSI`：`src-tauri/target/release/bundle/msi/轻单_0.1.0_x64_zh-CN.msi`
  - `NSIS EXE`：`src-tauri/target/release/bundle/nsis/轻单_0.1.0_x64-setup.exe`
- 之前阻塞 `MSI` 的根因不是 WiX 缺失，而是默认 `1252` 代码页无法承载中文产品名与安装项文本。
- 通过为 WiX 增加中文本地化配置后，`light.exe` 和后续 `makensis` 均已成功执行。

### 决策原因

- 既然第一版功能与手工验收已经基本收口，当前最优先的就是把“可交付安装包”真正做出来。
- Windows 安装器对中文字符串的代码页要求比较明确，不显式配置本地化时，中文产品名会在 WiX 链接阶段失败。

### 文档更新

- 更新了 [docs/V1_ACCEPTANCE.md](E:/CodeBase/docs/V1_ACCEPTANCE.md)，将 `MSI` 打包项标记为通过。
- 更新了 [docs/PROJECT_CONSTRAINTS.md](E:/CodeBase/docs/PROJECT_CONSTRAINTS.md)，补充“中文产品名需显式提供 WiX 中文本地化配置”的约束，并将发布状态更新为“已可生成 MSI 与 NSIS 安装包”。

### 实现记录

- 新增了 [src-tauri/wix/zh-CN.wxl](E:/CodeBase/src-tauri/wix/zh-CN.wxl)，为 WiX 提供中文语言与代码页配置。
- 更新了 [src-tauri/tauri.conf.json](E:/CodeBase/src-tauri/tauri.conf.json)，将 Windows WiX 语言配置切到 `zh-CN` 并引用自定义 `localePath`。

### 验证记录

- 使用 `cmd /c npm.cmd run tauri:build` 完成正式打包验证。
- 构建结果显示 `MSI` 与 `NSIS` 两种 Windows 安装产物都已成功生成。

### 当前风险

- 当前图标资源虽然已参与打包，但仍然是占位图标，不代表最终品牌交付质量。
- 当前安装包命名和版本信息可用，但还没有做发布说明与版本发布流程整理。

### 下一步建议

- 如果继续收口第一版，下一步优先替换正式品牌图标。
- 如需开始实际分发，再补一份简短发布说明，明确推荐用户使用 `MSI` 还是 `NSIS EXE`。

## 2026-04-09 第 18 轮

### 讨论主题

- 安装版打开时弹出额外 `cmd` 窗口，以及安装版读取到开发阶段已有数据这两个现象的定位与处理。

### 当前结论

- 安装版弹出 `cmd` 窗口不是预期行为，根因是 Windows 发布版尚未显式切到 `windows` 子系统。
- 已在宿主层入口补充 `windows_subsystem = "windows"`，用于消除发布版额外控制台窗口。
- 安装版读到之前的数据属于当前设计下的正常现象。
- 根因是开发版和安装版当前共享同一应用标识 `com.qingdan.desktop`，因此共用同一个 `AppData` 目录和 SQLite 文件。

### 决策原因

- 对最终用户而言，桌面应用启动时额外弹出控制台窗口会直接破坏“正常 Windows 应用”的观感，因此应优先修正。
- 数据共用虽然可能让测试时感觉“串环境”，但它符合当前标识与存储策略，也避免了把已有数据无意隔离或丢开。

### 文档更新

- 更新了 [docs/PROJECT_CONSTRAINTS.md](E:/CodeBase/docs/PROJECT_CONSTRAINTS.md)，补充“Windows 发布版需使用 `windows_subsystem = \"windows\"`”和“开发版与安装版当前共享同一 AppData 数据目录”的约束说明。

### 实现记录

- 更新了 [src-tauri/src/main.rs](E:/CodeBase/src-tauri/src/main.rs)，为非调试构建启用 `windows_subsystem = "windows"`。

### 下一步建议

- 重新打包并安装最新构建，验证安装版是否已不再弹出控制台窗口。
- 如后续确实需要“开发数据”和“安装版数据”彻底隔离，再单独设计 dev/prod 数据目录策略，不在这一轮隐式修改。

## 2026-04-09 第 19 轮

### 讨论主题

- 将当前第一版安装产物整理为可下载发布物，并准备通过 GitHub Releases 对外提供下载。

### 当前结论

- 当前可对外分发的 Windows 安装产物已经就绪：
  - `MSI`：`src-tauri/target/release/bundle/msi/轻单_0.1.0_x64_zh-CN.msi`
  - `NSIS EXE`：`src-tauri/target/release/bundle/nsis/轻单_0.1.0_x64-setup.exe`
- 当前发布建议优先提供 `MSI`，同时保留 `EXE` 作为备用安装方式。
- GitHub Release 将以 `v0.1.0` 作为第一版发布标签。

### 决策原因

- 第一版功能、验收和安装包链路已基本收口，继续停留在本地产物阶段意义不大，应尽快转成可下载链接。
- `MSI` 更符合 Windows 标准安装体验；`NSIS EXE` 适合作为兼容性更高的备用方案。

### 当前风险

- 当前图标资源仍为占位图标，虽然不阻塞发布，但会影响第一版的品牌完成度。
- 开发版与安装版仍共享同一应用数据目录，后续如果要做隔离，需要单独设计迁移策略。

### 下一步建议

- 创建 GitHub `v0.1.0` Release 并上传 `MSI` 与 `NSIS EXE` 产物。
- 发布完成后再补充一份简短的下载和安装说明。
