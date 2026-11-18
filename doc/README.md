# SVG 编辑器 Phase 2 设计文档

本文档对应题目 `doc/pj1-phase2/phase_cli_2.md`（Lab1 Phase 2）。Phase 1 的设计文档已经移到 [doc/pj1-phase1/README.md](pj1-phase1/README.md)，那里的内容不再修改。

关于目录名的说明：题目同时提到 `doc/README.md` 和 `docs/metrics/` 两个位置，所以仓库里两个目录都有。`doc/` 放设计文档和会话脚本，`docs/metrics/` 只放由脚本生成的度量结果。

本文档的第 1 节是在写代码之前完成的方案。实现过程中对方案的改动都记在 1.6 修订记录里。

## 1 架构方案

### 1.1 三类代码，三个顶层目录

题目的差异判据要求"内核与既有插件的差异为 0"，度量也要求按"内核 / 装配处 / 插件"三类统计。所以本方案让三类代码各占一个顶层目录，`git diff` 和行数统计都可以直接按目录来做。

```text
src/        内核。接入新插件时，这里的文件一个都不改。
  domain/     图形类层次、SvgDocument、备忘录，以及 ShapeProvider、AttributeHandler 等扩展点接口
  command/    命令基类、执行器、Workspace、内置命令类、TreeRenderer，以及 CommandProvider、TreeDecorator 等扩展点接口
  io/         SvgReader（按 ShapeProvider 查找类型）、SvgWriter
  cli/        Repl，以及把命令注册表接到 commander 上的 CliProgram
  builtin/    六种内置图形和 Phase 1 的内置命令表，它们也通过注册机制装配
  api/        Plugin 与 PluginContext；index.ts 是插件唯一可以导入的入口（@svgframe/api）
app/        装配处。
  main.ts     组合根：先装内置能力，再按方式 A 的代码清单或方式 B 的配置文件装插件
  host/       PluginHost、StagedContext、PluginManifest、PluginConfig、PluginLoader
plugins/    插件。每个插件是一个 bun workspace 包，package.json 里有 main、exports 和 contributes。
  command-stats/  command-dir/  shape-box/  tree-star/
vscode-extension/   第一部分的 VSCode 扩展，单独的包和 tsconfig，度量时单独列出
plugins.config.json 方式 B 的配置文件
scripts/            度量脚本和基线脚本
```

依赖方向：`plugins` 只能导入 `@svgframe/api`，不能导入内核的内部路径、装配处或其他插件。`app` 可以依赖内核和 `node:*`。内核不依赖 `app` 和任何插件。这些规则由 oxlint 的 `no-restricted-imports` 检查。

### 1.2 扩展点清单（草稿）

最终版本会给出每个扩展点在代码中的准确位置和对应的测试名。

| 扩展点                         | 内核侧类型                                                        | 内核调用它的位置                                    | 本阶段的实现                      | 不装可选插件时的行为                                                                                                | 违反契约时的报错                                                                                                                                |
| ------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `ShapeProvider`                | `{ type; create(id): Shape }`                                     | `SvgDocument.create`、`SvgReader` 查找元素类型      | 六种内置图形、`box`               | `unknown shape type: box (is the plugin loaded?)`；读入 `<g data-kind="box">` 时按普通 `g` 处理，并保留 `data-kind` | 类型名重复时拒绝注册；读回时创建出的标签与元素标签不同，就退回按标签查找                                                                        |
| `Command`（`CommandProvider`） | `{ name; syntax; description; create(args, ctx): Command }`       | `CliProgram.run`                                    | 19 条内置命令、`stats`、`dir`     | `error: unknown command: <name>`                                                                                    | 命令名重复时拒绝注册；抛出非 EditorError 的异常时显示 `error: internal: …`                                                                      |
| `TreeDecorator`                | `{ name; label(shape): string \| undefined }`                     | `TreeRenderer.render` 通过 `DecoratingLabel` 链调用 | `modified-star`、`box-type-label` | 树的输出与 Phase 1 逐字节相同                                                                                       | 抛错时显示 `error: tree decorator failed: <name> (<reason>)`                                                                                    |
| `AttributeHandler`             | `{ name; handles(shape, attr); apply(shape, attr, value, edit) }` | `SvgDocument.set`                                   | `box-attributes`                  | 内置的 `StandardAttributes` 按 Phase 1 的白名单处理，未知属性报 `unknown attribute: x`                              | 两个以上处理器命中时，在任何写入之前报 `conflicting attribute handlers …`；处理器抛错时回滚，并报 `attribute handler failed: <name> (<reason>)` |

每个扩展点都有三类测试：注册、调用和缺省行为。

### 1.3 两种装配方式

两种方式都调用同一个 `PluginHost.install(plugin, manifest, options)`，所以经过同一条注册和校验路径。

- 方式 A：`app/main.ts` 里列出插件的工厂函数 `() => import('@svgframe/plugin-x')`。只有走方式 A 时，这些工厂才会被调用。所以导入、构造和 `activate` 都在 `install` 的失败边界之内。
- 方式 B：`--config <file>` 指定配置文件。加载器 `PluginLoader` 按字符串形式的模块名解析和导入插件，代码里没有任何具体插件的名字。
- `--no-plugins` 只装内置能力，用来和 Phase 1 的输出做对比。

### 1.4 ADR 草稿

**ADR 1 属性扩展点的契约。** 内核先找到目标图形，再询问每个已注册处理器的 `handles()`。`handles()` 必须是纯函数。两个以上处理器命中时，命令在任何写入之前失败。只有一个命中时，由它执行修改。没有命中时，由内置的 `StandardAttributes` 执行，所以 `set` 只有一条代码路径。处理器只能通过 `AttributeEdit.set(target, name, value)` 写入。每次写入都会记下目标属性原来的准确值，所以一次 `set` 无论改了几个子部件，都是一个 undo 单元。处理器中途抛错时，`AttributeEdit` 按相反顺序恢复已经写入的值，命令报错，不进入历史，redo 栈也不变。

**ADR 2 box 的读回。** 文件中任何地方出现重复 id，整个读入都被拒绝。只有当 `data-kind` 指定的类型创建出的标签与元素标签相同时，读入才使用这个类型。装了 box 插件时，如果 box 缺少子部件或子部件类型不对，整个读入都被拒绝。读入失败时，原来的文档、路径、历史和 dirty 基线都保持不变。

**ADR 3 dirty 的语义。** 按内容判定。打开或保存文档时，`modified-star` 记下每个 id 的指纹（类型、父节点 id、属性、文本），以及根节点的指纹（画布属性和全部 id 的顺序）。一行的指纹与基线不同，或者这一行是新节点，就加 `*`。祖先不跟着标记。只调整顺序时，只有根节点那一行加 `*`。undo 回到保存点以后，`*` 消失。同一行的多个标签按注册顺序用一个空格连接。

**ADR 4 加载与校验的时机。** 安装一个插件的顺序是：检查清单的格式，在暂存上下文 `StagedContext` 中调用 `activate`，检查重复注册，比较声明与实际注册，最后一次性提交。任何一步失败，暂存的注册全部丢弃，已经成功的插件保留，加载继续进行。

### 1.5 实施顺序

1. 第一部分：VSCode 扩展（文件标记、大纲、测试、分析）。
2. 框架：工作区与模块规则、组合根移到 `app/`、四个扩展点、插件宿主、两种装配方式、端到端对比、度量脚本。
3. 命令插件 `stats` 和 `dir`。
4. 图形插件 `box`，两种装配方式各演示一次。
5. 树标签 `modified-star`。
6. 收尾：最终文档、度量结果、tag `p2`。

每一步是一次独立的提交，提交前运行 `bun run check`。

### 1.6 修订记录

| 日期       | 改动     | 原因 |
| ---------- | -------- | ---- |
| 2026-11-18 | 初版方案 |      |

## 2 过程记录

### 2.1 方案评审

方案由 AI（Claude Code，Opus 5.5）起草。起草之后进行了两轮评审，评审意见由 AI 逐条筛选，结果再交给我确认。

1. 第一轮由另外两个模型评审：gpt-6-astra（中等推理强度）和 Opus 5.5（高推理强度）。两者都指出，原方案的差异检查没有覆盖 `src/main.ts`，所以组合根被移到了 `app/`。Opus 指出，方式 A 和方式 B 的提交之间，端到端对比可能失效，所以对比测试改用一份与 `app/main.ts` 对应的装配配置。Opus 还指出 oxlint 自带 `eslint/complexity` 规则，推翻了 AI 认为"oxlint 没有圈复杂度规则"的假设。
2. 第二轮由 gpt-6.2-astra（中等推理强度）评审一次、gpt-6.2-sol（高推理强度）评审两次，再由 Opus 5.5 筛选。被采纳的主要意见有：方式 A 改为惰性导入，让导入失败也落在回滚边界之内；`Decimal` 的字符串只保留 6 位小数，所以属性备忘录必须保存原来的准确值；观察者抛错时要单独捕获。
3. 没有采纳的意见也记了下来。例如，有评审建议保留 Phase 1 读入时对重复 id 的自动改名，但题目要求重复 id 必须拒绝整个读入，我选择了全局拒绝。又如，有评审建议不要合并方式 A 的演示分支，但这个分支需要留在远程仓库里作为证据，所以仍然合并。
4. 评审中有两处需要我决定：读入时出现重复 id 一律拒绝；`dir` 的输出采用题目示例中的格式（`[DIR]` 后两个空格，`[FILE]` 后一个空格），题目文字与示例的冲突记在附录 A。
