# 度量：final → HEAD

本文件由 `bun scripts/metrics.ts --from final --to HEAD` 生成，请勿手改。final = `3084d36`，HEAD = `5da3b4f`。行数只数非空行。圈复杂度由 oxlint 的 `eslint/complexity` 规则逐个单元给出（单元是函数、方法、访问器、构造器、箭头函数和类字段初始化器），再按文件和类别求和。

## 按类别汇总

| 类别 | 文件数 | 非空行 | 单元数 | 圈复杂度合计 |
| --- | --- | --- | --- | --- |
| 内核 | 47 → 69 (+22) | 1821 → 2410 (+589) | 316 → 381 (+65) | 475 → 594 (+119) |
| 装配处 | 1 → 9 (+8) | 8 → 392 (+384) | 0 → 52 (+52) | 0 → 108 (+108) |
| 插件 | 0 → 0 (0) | 0 → 0 (0) | 0 → 0 (0) | 0 → 0 (0) |
| VSCode 扩展 | 0 → 5 (+5) | 0 → 150 (+150) | 0 → 16 (+16) | 0 → 26 (+26) |
| 脚本 | 0 → 1 (+1) | 0 → 45 (+45) | 0 → 1 (+1) | 0 → 2 (+2) |
| 测试 | 15 → 42 (+27) | 1634 → 2901 (+1267) | 276 → 498 (+222) | 299 → 582 (+283) |

## 圈复杂度增量（只列有变化的文件）

| 文件 | 类别 | 之前 | 之后 | 增量 |
| --- | --- | --- | --- | --- |
| `app/host/Assembly.ts` | 装配处 | 0 | 8 | +8 |
| `app/host/PluginConfig.ts` | 装配处 | 0 | 24 | +24 |
| `app/host/PluginHost.ts` | 装配处 | 0 | 24 | +24 |
| `app/host/PluginLoader.ts` | 装配处 | 0 | 5 | +5 |
| `app/host/PluginManifest.ts` | 装配处 | 0 | 23 | +23 |
| `app/host/StagedBatch.ts` | 装配处 | 0 | 7 | +7 |
| `app/host/StagedContext.ts` | 装配处 | 0 | 17 | +17 |
| `scripts/baseline.ts` | 脚本 | 0 | 2 | +2 |
| `src/builtin/BuiltinCommandProvider.ts` | 内核 | 0 | 2 | +2 |
| `src/builtin/BuiltinCommands.ts` | 内核 | 0 | 45 | +45 |
| `src/builtin/BuiltinShapes.ts` | 内核 | 0 | 3 | +3 |
| `src/cli/CliProgram.ts` | 内核 | 48 | 28 | -20 |
| `src/cli/Repl.ts` | 内核 | 18 | 21 | +3 |
| `src/command/CreateCommand.ts` | 内核 | 6 | 8 | +2 |
| `src/command/DecoratingLabel.ts` | 内核 | 0 | 5 | +5 |
| `src/command/Extensions.ts` | 内核 | 0 | 7 | +7 |
| `src/command/PlainLabel.ts` | 内核 | 0 | 1 | +1 |
| `src/command/SetCommand.ts` | 内核 | 8 | 7 | -1 |
| `src/command/TreeCommand.ts` | 内核 | 10 | 2 | -8 |
| `src/command/TreeRenderer.ts` | 内核 | 0 | 11 | +11 |
| `src/command/Workspace.ts` | 内核 | 16 | 26 | +10 |
| `src/domain/AttributeChange.ts` | 内核 | 0 | 3 | +3 |
| `src/domain/AttributeEdit.ts` | 内核 | 0 | 9 | +9 |
| `src/domain/AttributeMemento.ts` | 内核 | 3 | 2 | -1 |
| `src/domain/BasicShapeProvider.ts` | 内核 | 0 | 2 | +2 |
| `src/domain/Canvas.ts` | 内核 | 12 | 13 | +1 |
| `src/domain/Catalog.ts` | 内核 | 0 | 16 | +16 |
| `src/domain/Group.ts` | 内核 | 21 | 23 | +2 |
| `src/domain/Registry.ts` | 内核 | 0 | 10 | +10 |
| `src/domain/Shape.ts` | 内核 | 44 | 53 | +9 |
| `src/domain/ShapeFactory.ts` | 内核 | 6 | 0 | -6 |
| `src/domain/StandardAttributes.ts` | 内核 | 0 | 2 | +2 |
| `src/domain/SvgDocument.ts` | 内核 | 53 | 64 | +11 |
| `src/io/SvgReader.ts` | 内核 | 63 | 64 | +1 |
| `test/cli/CliProgram.test.ts` | 测试 | 17 | 23 | +6 |
| `test/cli/Repl.test.ts` | 测试 | 11 | 12 | +1 |
| `test/command/TreeDecorators.test.ts` | 测试 | 0 | 14 | +14 |
| `test/command/WorkspaceObservers.test.ts` | 测试 | 0 | 7 | +7 |
| `test/domain/AttributeHandlers.test.ts` | 测试 | 0 | 30 | +30 |
| `test/domain/Catalog.test.ts` | 测试 | 0 | 11 | +11 |
| `test/domain/CompositeShapes.test.ts` | 测试 | 0 | 27 | +27 |
| `test/e2e/Assembly.test.ts` | 测试 | 0 | 6 | +6 |
| `test/e2e/Transcripts.test.ts` | 测试 | 12 | 14 | +2 |
| `test/fixtures/plugins/bad-activate/src/index.ts` | 测试 | 0 | 4 | +4 |
| `test/fixtures/plugins/duplicate/src/index.ts` | 测试 | 0 | 1 | +1 |
| `test/fixtures/plugins/mark/src/index.ts` | 测试 | 0 | 3 | +3 |
| `test/fixtures/plugins/mismatch/src/index.ts` | 测试 | 0 | 2 | +2 |
| `test/fixtures/plugins/throws-on-load/src/index.ts` | 测试 | 0 | 1 | +1 |
| `test/host/PluginConfig.test.ts` | 测试 | 0 | 10 | +10 |
| `test/host/PluginHost.test.ts` | 测试 | 0 | 41 | +41 |
| `test/io/SvgReader.test.ts` | 测试 | 19 | 23 | +4 |
| `test/lint/ModuleRules.test.ts` | 测试 | 0 | 11 | +11 |
| `test/spike/PluginPackages.test.ts` | 测试 | 0 | 9 | +9 |
| `test/support/EchoProvider.ts` | 测试 | 0 | 4 | +4 |
| `test/support/FixedDecorator.ts` | 测试 | 0 | 2 | +2 |
| `test/support/MemorySource.ts` | 测试 | 0 | 10 | +10 |
| `test/support/RecordingObserver.ts` | 测试 | 0 | 7 | +7 |
| `test/support/ScriptedHandler.ts` | 测试 | 0 | 4 | +4 |
| `test/support/Session.ts` | 测试 | 12 | 16 | +4 |
| `test/support/TranscriptRunner.ts` | 测试 | 0 | 8 | +8 |
| `vscode-extension/integration/Badge.itest.ts` | 测试 | 0 | 10 | +10 |
| `vscode-extension/integration/Outline.itest.ts` | 测试 | 0 | 21 | +21 |
| `vscode-extension/src/SvgBadgeProvider.ts` | VSCode 扩展 | 0 | 7 | +7 |
| `vscode-extension/src/SvgFileFilter.ts` | VSCode 扩展 | 0 | 2 | +2 |
| `vscode-extension/src/SvgOutline.ts` | VSCode 扩展 | 0 | 10 | +10 |
| `vscode-extension/src/SvgOutlineProvider.ts` | VSCode 扩展 | 0 | 6 | +6 |
| `vscode-extension/src/extension.ts` | VSCode 扩展 | 0 | 1 | +1 |
| `vscode-extension/test/SvgFileFilter.test.ts` | 测试 | 0 | 2 | +2 |
| `vscode-extension/test/SvgOutline.test.ts` | 测试 | 0 | 21 | +21 |

## 文件清单与职责（HEAD）

| 文件 | 类别 | 非空行 | 圈复杂度 | 职责 |
| --- | --- | --- | --- | --- |
| `app/host/Assembly.ts` | 装配处 | 25 | 8 | Assembly reads the command line and picks the plugins. |
| `app/host/PluginConfig.ts` | 装配处 | 58 | 24 | PluginConfig is the config file of mode B. |
| `app/host/PluginHost.ts` | 装配处 | 84 | 24 | PluginHost installs plugins into the extensions. |
| `app/host/PluginLoader.ts` | 装配处 | 36 | 5 | PluginLoader is the source of one plugin from a config file. |
| `app/host/PluginManifest.ts` | 装配处 | 54 | 23 | PluginManifest is the part of a plugin's package.json that the host reads: the package `name` and the `contributes` lists, which declare every extension that the plugin registers. |
| `app/host/PluginSource.ts` | 装配处 | 14 | 0 | Tells the host where one plugin comes from. |
| `app/host/StagedBatch.ts` | 装配处 | 23 | 7 | StagedBatch holds the extensions of one category that a plugin registered, until the commit. |
| `app/host/StagedContext.ts` | 装配处 | 69 | 17 | StagedContext is the context that one plugin activates into. |
| `app/main.ts` | 装配处 | 29 | 0 | This file is the composition root. |
| `scripts/baseline.ts` | 脚本 | 45 | 2 | Records the output of the tag `final` (Phase 1) for the transcripts in doc/transcript/. |
| `src/api/Plugin.ts` | 内核 | 12 | 0 | A plugin is the default export of a plugin package: a class whose constructor takes no arguments. |
| `src/api/PluginContext.ts` | 内核 | 19 | 0 | The context that a plugin gets in `activate`. |
| `src/api/index.ts` | 内核 | 6 | 0 | This file is the only import surface for plugins. |
| `src/builtin/BuiltinCommandProvider.ts` | 内核 | 23 | 2 | A command provider for one built-in verb. |
| `src/builtin/BuiltinCommands.ts` | 内核 | 173 | 45 | The 19 commands of Phase 1, in the order that `help` lists them. |
| `src/builtin/BuiltinShapes.ts` | 内核 | 22 | 3 | The six shape types of Phase 1. |
| `src/cli/CliProgram.ts` | 内核 | 107 | 28 | CliProgram is the client in the Command pattern. |
| `src/cli/Repl.ts` | 内核 | 67 | 21 | Repl is the read-eval-print loop. |
| `src/command/AddtoCommand.ts` | 内核 | 29 | 7 | AddtoCommand moves a shape to the end of a container. |
| `src/command/BackCommand.ts` | 内核 | 23 | 5 | BackCommand paints a shape below its siblings. |
| `src/command/CanvasCommand.ts` | 内核 | 13 | 2 | The `canvas` command without arguments. |
| `src/command/Command.ts` | 内核 | 11 | 2 | A command is one user request, stored as an object. |
| `src/command/CommandContext.ts` | 内核 | 12 | 0 | The receivers that a command provider may hand to the commands that it creates. |
| `src/command/CommandExecutor.ts` | 内核 | 48 | 12 | CommandExecutor is the invoker in the Command pattern. |
| `src/command/CommandProvider.ts` | 内核 | 20 | 0 | Extension point 2. |
| `src/command/CreateCommand.ts` | 内核 | 45 | 8 | CreateCommand creates a shape, optionally inside a container. |
| `src/command/DecoratingLabel.ts` | 内核 | 27 | 5 | The decorator of the Decorator pattern, like DecoratingLabelProvider in JFace. |
| `src/command/DeleteCommand.ts` | 内核 | 25 | 6 | DeleteCommand removes a shape and everything inside it. |
| `src/command/DocumentCommand.ts` | 内核 | 11 | 1 | The base class of init, read, save and canvas resize. |
| `src/command/EditCommand.ts` | 内核 | 10 | 2 | An edit command is a change to the document that the user can undo. |
| `src/command/Extensions.ts` | 内核 | 15 | 7 | Extensions holds everything that the built-in code and the plugins have registered. |
| `src/command/FrontCommand.ts` | 内核 | 23 | 5 | FrontCommand paints a shape above its siblings. |
| `src/command/GroupCommand.ts` | 内核 | 28 | 6 | GroupCommand puts shapes into a new container. |
| `src/command/HelpCommand.ts` | 内核 | 15 | 2 | The `help` command. |
| `src/command/InitCommand.ts` | 内核 | 19 | 2 | InitCommand starts a new empty document with a canvas of the given size. |
| `src/command/MoveCommand.ts` | 内核 | 31 | 5 | MoveCommand moves a shape by an offset. |
| `src/command/PlainLabel.ts` | 内核 | 7 | 1 | The concrete component of the Decorator pattern. |
| `src/command/ReadCommand.ts` | 内核 | 18 | 4 | The `read <file>` command. |
| `src/command/RedoCommand.ts` | 内核 | 17 | 2 | RedoCommand runs the last undone edit again. |
| `src/command/ResizeCommand.ts` | 内核 | 23 | 2 | The `canvas <w> [h]` command. |
| `src/command/SaveCommand.ts` | 内核 | 18 | 3 | The `save [file]` command. |
| `src/command/ScaleCommand.ts` | 内核 | 27 | 5 | ScaleCommand multiplies the position and size of a shape. |
| `src/command/SetCommand.ts` | 内核 | 29 | 7 | The `set <id> <attr> <value>` command. |
| `src/command/ShowCommand.ts` | 内核 | 19 | 4 | The `show <id>` command. |
| `src/command/TreeCommand.ts` | 内核 | 18 | 2 | The `tree [id]` command. |
| `src/command/TreeDecorator.ts` | 内核 | 11 | 0 | Extension point 3. |
| `src/command/TreeLabel.ts` | 内核 | 6 | 0 | The component interface of the Decorator pattern for the rows of `tree`. |
| `src/command/TreeRenderer.ts` | 内核 | 44 | 11 | TreeRenderer is the receiver of `tree`. |
| `src/command/UndoCommand.ts` | 内核 | 18 | 2 | UndoCommand reverts the last edit. |
| `src/command/UngroupCommand.ts` | 内核 | 24 | 5 | UngroupCommand dissolves a container into its parent. |
| `src/command/Workspace.ts` | 内核 | 85 | 26 | 待重构: The command module uses io directly. |
| `src/command/WorkspaceObserver.ts` | 内核 | 12 | 0 | An observer of the workspace (Observer pattern, push model). |
| `src/domain/AttributeChange.ts` | 内核 | 21 | 3 | AttributeChange records one write of one attribute. |
| `src/domain/AttributeEdit.ts` | 内核 | 33 | 9 | AttributeEdit collects every write of one `set` command, so that one undo restores all of them. |
| `src/domain/AttributeHandler.ts` | 内核 | 20 | 0 | Extension point 4. |
| `src/domain/AttributeMemento.ts` | 内核 | 19 | 2 | Holds the text value that one attribute had before `set`. |
| `src/domain/BasicShapeProvider.ts` | 内核 | 14 | 2 | A shape provider for a shape class whose constructor takes only the id. |
| `src/domain/Canvas.ts` | 内核 | 44 | 13 | Canvas is the `<svg>` root. |
| `src/domain/Catalog.ts` | 内核 | 40 | 16 | Catalog holds the shape types and the attribute handlers that the document knows. |
| `src/domain/Circle.ts` | 内核 | 8 | 2 | A circle with a center (cx, cy) and a radius r. |
| `src/domain/Decimal.ts` | 内核 | 43 | 12 | Decimal is an immutable value object for every number that the editor handles. |
| `src/domain/EditorError.ts` | 内核 | 7 | 1 | An EditorError reports a mistake by the user. |
| `src/domain/Ellipse.ts` | 内核 | 8 | 2 | An ellipse with a center (cx, cy) and the radii rx and ry. |
| `src/domain/GeometryMemento.ts` | 内核 | 17 | 3 | Holds the exact geometry of one leaf. |
| `src/domain/Group.ts` | 内核 | 64 | 23 | Group is the Composite container. |
| `src/domain/Journal.ts` | 内核 | 14 | 3 | A journal holds the mementos of an edit with several steps. |
| `src/domain/Leaf.ts` | 内核 | 73 | 28 | Leaf applies the Template Method pattern. |
| `src/domain/Line.ts` | 内核 | 15 | 4 | A line from (x1, y1) to (x2, y2). |
| `src/domain/Memento.ts` | 内核 | 7 | 0 | A memento holds the minimum state from before one edit. |
| `src/domain/Placement.ts` | 内核 | 21 | 6 | Records where a shape is right now: its parent and its index. |
| `src/domain/Rect.ts` | 内核 | 11 | 3 | A rectangle with a corner (x, y), a width and a height. |
| `src/domain/Registry.ts` | 内核 | 38 | 10 | Registry keeps the extensions of one category by name, in the order of registration. |
| `src/domain/Shape.ts` | 内核 | 164 | 53 | The positional parameters of `create <type> <id> ...`. |
| `src/domain/ShapeProvider.ts` | 内核 | 11 | 0 | Extension point 1. |
| `src/domain/StandardAttributes.ts` | 内核 | 17 | 2 | The default attribute rule. |
| `src/domain/SvgDocument.ts` | 内核 | 209 | 64 | SvgDocument is the receiver of every edit command. |
| `src/domain/Text.ts` | 内核 | 33 | 11 | In SVG, the content is the element's child text, so it counts as an attribute only for `set`. |
| `src/io/SvgReader.ts` | 内核 | 204 | 64 | SvgReader turns SVG text into a document. |
| `src/io/SvgWriter.ts` | 内核 | 45 | 8 | SvgWriter writes a document as indented SVG text. |
| `vscode-extension/src/SvgBadgeProvider.ts` | VSCode 扩展 | 32 | 7 | SvgBadgeProvider gives every SVG file in the Explorer the badge "[]". |
| `vscode-extension/src/SvgFileFilter.ts` | VSCode 扩展 | 8 | 2 | SvgFileFilter decides by name alone whether a path looks like an SVG file. |
| `vscode-extension/src/SvgOutline.ts` | VSCode 扩展 | 64 | 10 | One element in the outline. |
| `vscode-extension/src/SvgOutlineProvider.ts` | VSCode 扩展 | 33 | 6 | SvgOutlineProvider is an adapter. |
| `vscode-extension/src/extension.ts` | VSCode 扩展 | 13 | 1 | VS Code calls activate() once, after startup. |

## 测试文件（HEAD）

| 文件 | 非空行 |
| --- | --- |
| `test/cli/CliProgram.test.ts` | 162 |
| `test/cli/Repl.test.ts` | 88 |
| `test/command/CommandExecutor.test.ts` | 112 |
| `test/command/DisplayCommands.test.ts` | 76 |
| `test/command/DocumentCommands.test.ts` | 99 |
| `test/command/EditCommands.test.ts` | 81 |
| `test/command/StructureCommands.test.ts` | 65 |
| `test/command/TreeDecorators.test.ts` | 50 |
| `test/command/UndoRedo.property.test.ts` | 106 |
| `test/command/WorkspaceObservers.test.ts` | 55 |
| `test/domain/AttributeHandlers.test.ts` | 118 |
| `test/domain/Catalog.test.ts` | 58 |
| `test/domain/CompositeShapes.test.ts` | 97 |
| `test/domain/Decimal.test.ts` | 26 |
| `test/domain/Shapes.test.ts` | 244 |
| `test/domain/SvgDocument.test.ts` | 284 |
| `test/e2e/Assembly.test.ts` | 44 |
| `test/e2e/Transcripts.test.ts` | 77 |
| `test/fixtures/plugins/bad-activate/src/index.ts` | 14 |
| `test/fixtures/plugins/duplicate/src/index.ts` | 8 |
| `test/fixtures/plugins/mark/src/index.ts` | 9 |
| `test/fixtures/plugins/mismatch/src/index.ts` | 7 |
| `test/fixtures/plugins/no-default/src/index.ts` | 2 |
| `test/fixtures/plugins/spike/src/index.ts` | 3 |
| `test/fixtures/plugins/throws-on-load/src/index.ts` | 5 |
| `test/host/PluginConfig.test.ts` | 103 |
| `test/host/PluginHost.test.ts` | 174 |
| `test/io/SvgReader.test.ts` | 170 |
| `test/io/SvgWriter.test.ts` | 53 |
| `test/lint/ModuleRules.test.ts` | 54 |
| `test/spike/PluginPackages.test.ts` | 58 |
| `test/support/EchoProvider.ts` | 15 |
| `test/support/FixedDecorator.ts` | 14 |
| `test/support/MemorySource.ts` | 35 |
| `test/support/RecordingObserver.ts` | 22 |
| `test/support/ScriptedHandler.ts` | 26 |
| `test/support/Session.ts` | 76 |
| `test/support/TranscriptRunner.ts` | 43 |
| `vscode-extension/integration/Badge.itest.ts` | 32 |
| `vscode-extension/integration/Outline.itest.ts` | 65 |
| `vscode-extension/test/SvgFileFilter.test.ts` | 15 |
| `vscode-extension/test/SvgOutline.test.ts` | 56 |
