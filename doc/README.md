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

| 日期       | 改动                                                                                                                                                                                     | 原因                                                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| 2026-11-18 | 初版方案                                                                                                                                                                                 |                                                                                                                             |
| 2026-11-18 | 读入文件时，任何位置出现重复 id 都拒绝整个读入，报 `cannot read file: <path> (duplicate id: <id>)`。Phase 1 附录 A 第 4 行原来的做法（重复 id 按缺失处理并重新编号）不再使用             | Phase 2 题目第 4 节要求重复 id 必须拒绝整个读入，不能靠降级消除                                                             |
| 2026-11-18 | 未知命令的提示从 commander 的 `unknown command 'mvoe' (Did you mean move?)` 改为 `unknown command: mvoe`。`--help` 也按未知命令处理                                                      | Phase 2 题目 2.3 节规定了这个格式。现在由命令注册表决定命令是否存在，commander 只检查参数。Phase 1 的原文是我们自己定的约定 |
| 2026-11-18 | 插件清单（`package.json`）格式不对时报 `invalid plugin manifest: <module> (<reason>)`，并且在加载入口模块之前就报。插件在 `activate` 之后还想注册时报 `the plugin context is closed`     | 方案的失败表里没有这两种情况。清单不对时无法核对声明，所以必须先报；关闭上下文是 V11 的要求，需要一条明确的报错             |
| 2026-11-18 | `Catalog` 里的图形类型和属性处理器、`Extensions` 里的观察者都改成公开的 `Registry`。`Registry` 新增 `check(items)`，先检查名字再一次性提交                                               | 宿主要对五类注册统一做重名检查和原子提交。如果每类各写一套检查方法，代码会重复                                              |
| 2026-11-18 | 测试用的夹具插件（`test/fixtures/plugins/`）不计入覆盖率                                                                                                                                 | 夹具插件里的很多函数只为被注册而存在，从不被调用。它们是测试数据，不是被测代码                                              |
| 2026-11-18 | `doc/transcript/cli-1.txt` 是 Phase 1 第 6 节的基础会话，`cli-2.txt` 是第 6.1 节版本 A 的会话；`stats`、`dir` 的会话是 `cli-3.txt`，第 6.1 节版本 B（box）的会话是 `cli-4.txt`           | 方案只写了 cli-1 和 cli-2 两个文件名。Phase 1 的两段会话都需要和 `final` 逐字节对照，所以先占用前两个编号                   |
| 2026-11-18 | 度量脚本不再使用人工复核的职责兜底表。Phase 1 中 16 个没有文档注释的类（12 个命令和 4 种叶子图形）补上了一句文档注释。复杂度的单元数包括类字段初始化器，因为 oxlint 把它们也当作单元报告 | 补注释比维护一张兜底表简单，代码本身也更清楚。单元的口径在度量报告的开头写明                                                |

## 2 过程记录

### 2.1 方案评审

方案由 AI（Claude Code，Opus 5.5）起草。起草之后进行了两轮评审，评审意见由 AI 逐条筛选，结果再交给我确认。

1. 第一轮由另外两个模型评审：gpt-6-astra（中等推理强度）和 Opus 5.5（高推理强度）。两者都指出，原方案的差异检查没有覆盖 `src/main.ts`，所以组合根被移到了 `app/`。Opus 指出，方式 A 和方式 B 的提交之间，端到端对比可能失效，所以对比测试改用一份与 `app/main.ts` 对应的装配配置。Opus 还指出 oxlint 自带 `eslint/complexity` 规则，推翻了 AI 认为"oxlint 没有圈复杂度规则"的假设。
2. 第二轮由 gpt-6.2-astra（中等推理强度）评审一次、gpt-6.2-sol（高推理强度）评审两次，再由 Opus 5.5 筛选。被采纳的主要意见有：方式 A 改为惰性导入，让导入失败也落在回滚边界之内；`Decimal` 的字符串只保留 6 位小数，所以属性备忘录必须保存原来的准确值；观察者抛错时要单独捕获。
3. 没有采纳的意见也记了下来。例如，有评审建议保留 Phase 1 读入时对重复 id 的自动改名，但题目要求重复 id 必须拒绝整个读入，我选择了全局拒绝。又如，有评审建议不要合并方式 A 的演示分支，但这个分支需要留在远程仓库里作为证据，所以仍然合并。
4. 评审中有两处需要我决定：读入时出现重复 id 一律拒绝；`dir` 的输出采用题目示例中的格式（`[DIR]` 后两个空格，`[FILE]` 后一个空格），题目文字与示例的冲突记在附录 A。

### 2.2 开发中发现并修正的问题

1. VSCode 截图：我在截图时发现，VS Code 默认用图片预览打开 `.svg` 文件。这时大纲视图显示 "The active editor cannot provide outline information"，点击大纲节点也会重新打开图片预览，而不是跳到源码。原因是大纲只对文本编辑器生效。AI 在示例文件夹里加了 `sample/.vscode/settings.json`，把 `*.svg` 的默认编辑器设为文本编辑器，这样打开示例文件夹时不需要改全局设置。

## 3 第一部分：VSCode 扩展

扩展的源码在 `vscode-extension/` 中，它是一个独立的 bun workspace 包，有自己的 `tsconfig.json`。

### 3.1 安装与启动

1. 在仓库根目录运行 `bun install`。
2. 在 `vscode-extension/` 中运行 `bun run build`，生成 `dist/extension.js`。
3. 运行 `code --extensionDevelopmentPath=<仓库路径>/vscode-extension <仓库路径>/vscode-extension/sample`。也可以用 VS Code 打开 `vscode-extension/` 文件夹，再按 F5（配置在 `.vscode/launch.json` 中）。

这样启动的是一个"扩展开发宿主"窗口。扩展只在这个窗口里加载，所以它不会出现在扩展视图的已安装列表中，关掉窗口以后也不会留下。

注意：VS Code 默认用图片预览打开 `.svg` 文件，大纲视图只对文本编辑器生效。示例文件夹里的 `.vscode/settings.json` 已经把 `*.svg` 设为用文本编辑器打开。在其他文件夹里，可以右键文件，选择 "Open With…"，再选 "Text Editor"。

测试：`bun test vscode-extension` 运行不依赖 VS Code 的单元测试。`vscode-extension/` 中的 `bun run test:integration` 在真实的 VS Code 扩展宿主里运行集成测试。如果本机已经装了 VS Code，可以用环境变量 `VSCODE_TEST_PATH` 指向 `Code.exe`，省去下载。CI 在 xvfb 下运行同一组集成测试。

示例文件是 `vscode-extension/sample/example.svg`。

### 3.2 原生大纲的行为（A.2 要求先观察）

在写代码之前，我们先在禁用所有扩展的 VS Code 里打开了示例文件。VS Code 用图片预览打开它，大纲视图显示 "The active editor cannot provide outline information"。改用文本编辑器打开时，VS Code 自带的 XML 支持只有语法高亮，大纲视图仍然没有内容。所以 SVG 的大纲需要由扩展提供。

![禁用扩展时，原生大纲没有内容](images/native-outline.png)

### 3.3 运行效果

Explorer 中 `example.svg` 的右侧显示 `[]`。文件夹 `assets` 和文本文件 `notes.txt` 没有这个标记，文件名也没有改变。（截图中的 `U` 是 Git 的"未跟踪"标记，与本扩展无关。）

![SVG 文件标记](images/vscode-badge.png)

大纲视图显示 SVG 的嵌套层级。有 id 的元素显示为 `标签名#id`，没有 id 的元素只显示标签名。选中 `rect#start` 以后，编辑器跳到第 3 行并选中这个元素。

![SVG 大纲与源码定位](images/vscode-outline.png)

### 3.4 VS Code 与插件的职责，以及注册和调用的过程

VS Code 负责界面（Explorer、大纲视图、编辑器）、文件系统、文档的内容和扩展的生命周期。它决定什么时候需要数据，也负责把数据画出来。插件只回答 VS Code 的提问：某个文件要不要加标记，某个文档有哪些元素。

注册和调用的过程如下：

1. `package.json` 声明入口 `main` 和激活事件 `onStartupFinished`。VS Code 启动完成后，加载 `dist/extension.js` 并调用其中的 `activate(context)`。
2. `activate` 调用 `window.registerFileDecorationProvider` 注册 `SvgBadgeProvider`，调用 `languages.registerDocumentSymbolProvider` 注册 `SvgOutlineProvider`。选择器是 `{ pattern: '**/*.svg' }`，所以不管编辑器为文件选了哪种语言模式，只要文件名匹配就生效。
3. 两个注册调用都返回 `Disposable`。`activate` 把它们放进 `context.subscriptions`，扩展停止时 VS Code 会注销它们。
4. 之后，Explorer 每显示一个条目，VS Code 就调用 `provideFileDecoration(uri)`。大纲视图需要内容时，或者文档被编辑以后，VS Code 调用 `provideDocumentSymbols(document)`。插件从不主动刷新界面。

这是"好莱坞原则"：插件把对象交给框架，由框架决定何时调用。

### 3.5 文件装饰与 Decorator 模式

| 方面     | 经典 Decorator                                       | VS Code 的文件装饰                                                                       |
| -------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 接口     | 装饰者和被装饰者实现同一个接口                       | `SvgBadgeProvider` 实现 `FileDecorationProvider`，它和 Explorer 条目不是同一个接口       |
| 对象组合 | 装饰者持有被装饰者的引用，一层包一层                 | 提供者不持有条目。VS Code 持有一组提供者，由它把各个提供者返回的标记、颜色和提示合并起来 |
| 调用关系 | 客户调用最外层，每一层先转发给内层，再加上自己的行为 | VS Code 分别询问每个提供者，提供者只返回数据，不转发调用                                 |

相同之处在于意图：两者都在不修改原对象（文件本身和 Explorer 的代码）的情况下，给它附加职责（显示的信息），而且多个装饰可以叠加。不同之处在于组合的位置：经典 Decorator 的组合在对象链里，VS Code 的组合在框架内部。所以，文件装饰更像是框架提供的"装饰扩展点"。第二部分的 `TreeDecorator` 借用了同样的思路：插件只返回标签，内核里的 `DecoratingLabel` 负责按 Decorator 模式把它们串起来。

### 3.6 大纲提供者与 Adapter 模式

| Adapter 的角色                 | 本扩展中的类                                                                                       |
| ------------------------------ | -------------------------------------------------------------------------------------------------- |
| 目标接口（Target），由客户定义 | VS Code 的 `DocumentSymbolProvider`                                                                |
| 客户（Client）                 | VS Code 的大纲视图                                                                                 |
| 被适配者（Adaptee）            | `SvgOutline`：输入文本，输出带字符偏移量的元素树                                                   |
| 适配器（Adapter）              | `SvgOutlineProvider`：持有一个 `SvgOutline`，把偏移量转换成行列位置，把元素转换成 `DocumentSymbol` |

这是对象适配器：适配器通过组合持有被适配者，而不是继承它。与教科书中的例子相比，这里的被适配者是为本扩展写的，并不是一个已有的、接口不匹配的旧类。但把它和 VS Code API 分开以后，`SvgOutline` 可以直接用 Bun 测试，适配器只负责数据转换。

### 3.7 Phase 1 代码的复用评估

- 可以复用：XML 格式检查。Phase 1 的 `SvgReader` 用 fast-xml-validator 检查格式，扩展沿用了同一个库和同样的做法：格式不对时不抛出异常，只返回空大纲。
- 不能复用 `SvgReader` 的解析部分，原因有四个。第一，它把 XML 转成领域对象以后，就丢掉了源码位置，而大纲定位必须知道每个元素在源码里的偏移量。第二，它跳过不认识的元素（例如 `<defs>`、`<path>`），而大纲应该显示文件里所有的元素。第三，它会给没有 id 的元素编号，Phase 2 还会拒绝重复 id，而大纲必须如实显示文件的内容。第四，它用 `node:fs` 从磁盘读文件，而大纲必须读取编辑器里尚未保存的内容。
- 不能复用 Phase 1 的模型：`Shape` 类层次只有六种图形，也没有位置信息。
- 遍历的思路可以复用，但代码不能直接复用。`Shape.walk()` 是组合模式上的通用先序遍历，如果模型里有偏移量，它可以直接生成大纲。但由于上面两点，扩展另建了一棵只有标签、id 和偏移量的轻量树，并用递归生成 `DocumentSymbol`。另外，扩展是独立打包的，不依赖 CLI 的内核。
