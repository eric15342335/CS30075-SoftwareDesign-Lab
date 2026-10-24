# SVG 编辑器 CLI 设计文档

对应题目 `phase_cli_1.md`（Lab1 Phase 1）。第 1 节的架构方案在写代码之前完成，实现中对方案的改动记入 1.6 修订记录。运行方式见仓库根目录的 `README.md`。

## 1 架构方案

### 1.1 模块划分

```text
src/
├── domain/    图形树（Composite）与文档 SvgDocument，命令的接收者
├── command/   命令类（含 tree、show 等显示类命令）、命令执行器 CommandExecutor、工作区 Workspace
├── io/        SVG 文本与领域对象互转，文件读写
├── cli/       REPL、命令行解析与分发
└── main.ts    组装入口（唯一不含类的文件）
```

| 模块    | 职责                                                                                                                                                                    | 主要类                                                                                                          |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| domain  | 图形的类层次与文档级约束：id 唯一且区分大小写、容器关系不成环、题目 4.2 节的错误信息。不做 IO，不依赖任何库。                                                           | `Shape` `Leaf` `Rect` `Circle` `Ellipse` `Line` `Text` `Group` `Canvas` `SvgDocument` `ShapeFactory`            |
| command | 每条命令一个类，tree、show、help 这些显示类命令也是命令，返回排好版的文本。`CommandExecutor` 负责执行、undo/redo 两个栈和 IO 屏障；`Workspace` 保存当前文档与文件路径。 | `Command` `EditCommand` `DocumentCommand` `MoveCommand` `TreeCommand` 等具体命令，`CommandExecutor` `Workspace` |
| io      | SVG 文本与领域对象之间的转换（解析用 fast-xml-parser，格式检查用 fast-xml-validator，写出用 fast-xml-builder），文件读写；读入时为缺失的 id 自动编号并给出警告。        | `SvgReader` `SvgWriter`                                                                                         |
| cli     | 逐行读入（node:readline，Tab 补全命令名和 id），切分参数，交给 commander 找到对应命令，打印反馈；在终端上错误显示为红色。                                               | `Repl` `CliProgram`                                                                                             |

模块关系（PlantUML 包图，由下方的源码在 plantuml.com 渲染）：

![模块关系图：cli 依赖 command 和 domain，command 依赖 io 和 domain，io 依赖 domain](architecture.svg)

<details>
<summary>PlantUML 源码</summary>

```plantuml
@startuml
skinparam packageStyle rectangle
package cli {
  [Repl]
  [CliProgram]
}
package command {
  [CommandExecutor]
  [具体命令类]
  [Workspace]
}
package io {
  [SvgReader]
  [SvgWriter]
}
package domain {
  [SvgDocument]
  [Shape 类层次]
  [ShapeFactory]
}
cli ..> command
cli ..> domain
command ..> domain
command ..> io
io ..> domain
@enduml
```

</details>

### 1.2 设计模式的选择

#### Command（题目要求）

| 角色            | 本项目中的类                                           | 职责                                                                  |
| --------------- | ------------------------------------------------------ | --------------------------------------------------------------------- |
| Command         | `Command`（抽象类）                                    | `execute()` 返回反馈文本；`recordIn(executor)` 决定执行成功后怎样记账 |
| ConcreteCommand | `CreateCommand`、`MoveCommand`、`GroupCommand` 等      | 一条命令一个类，只把请求转发给接收者，自己不做校验                    |
| Client          | `CliProgram`                                           | 把一行输入解析成命令对象，并绑定接收者                                |
| Invoker         | `CommandExecutor`                                      | 执行命令，维护 undo 栈、redo 栈和 IO 屏障                             |
| Receiver        | `SvgDocument`（编辑类命令）、`Workspace`（文档类命令） | 知道怎样完成操作；校验和错误信息都在这里                              |

这对应课件中的"方式 5"：入口（REPL）只持有命令对象，并委托 `CommandExecutor` 执行，业务逻辑留在接收者里。

三类命令的区别由多态方法 `recordIn` 实现，执行器里没有类型判断：

- `EditCommand`（create、delete、move、scale、set、group、ungroup、addto、front、back）：把自己压入 undo 栈，并清空 redo 栈。
- `DocumentCommand`（init、read、save、canvas 改尺寸）：清空两个栈并设置 IO 屏障。之后 undo/redo 报 `error: undo not allowed after io command`，直到下一条编辑命令成功执行。
- 其余命令（tree、show、help、undo、redo、canvas 查询）：不记账。

命令执行失败时抛出异常，`recordIn` 不会被调用，所以失败的命令既不改变状态，也不进入历史。

undo 的做法：每条命令只保存撤销自己所需的最少信息，不做整文档快照。课件提醒过 AI 常给出快照方案，它的代价随文档大小增长。

| 命令                               | 保存的信息                                    | undo                                                                              |
| ---------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------- |
| create                             | 新图形对象及其位置（父容器、下标）            | 从父容器摘下                                                                      |
| delete                             | 被删除的子树及其位置                          | 原位插回，子树内的 id 一并恢复                                                    |
| move、scale                        | 受影响子树的几何属性备忘（`GeometryMemento`） | 恢复原值。没有用"反向移动、乘 1/f"，因为浮点运算不可逆，反复 undo/redo 会累积误差 |
| set                                | 旧值，或"原先没有这个属性"                    | 写回旧值，或删除该属性                                                            |
| group、ungroup、addto、front、back | 每个被移动图形原来的位置（`Placement`）       | 按相反顺序放回                                                                    |

`group g1 r1 c1 t1` 整体是一个命令对象，一次 undo 还原全部。

#### Composite

`Shape` 是组件，`Rect` `Circle` `Ellipse` `Line` `Text` 是叶子（共同父类 `Leaf`），`Group` 是容器，`Canvas`（根元素 `<svg>`）是一种特殊的 `Group`。`move`、`scale`、`setAttribute`、删除和 `describe`（tree 中的一行摘要）对叶子和容器一视同仁，容器的 move/scale 递归到每个子孙。

GoF 讨论过"透明"与"安全"两种 Composite 写法，本项目用安全写法：增删子节点的方法只在 `Group` 上，`Shape` 只提供只读的 `children()`；判断是否为容器用多态方法 `asGroup()`，不用 `instanceof`。

#### Template Method

几何属性的处理在 `Leaf` 中只写一次。子类用 `geometry()` 声明自己的几何属性（如 rect 的 `x y width height`）以及每个属性在 move 时随 dx 变、随 dy 变还是不变（尺寸，且不能为负），`Leaf` 据此实现 move、scale、`set` 白名单和序列化；子类只覆盖 `summary()` 等真正不同的部分，例如 rect 在 tree 中把 width/height 缩写成 `w=`/`h=`。这样既不必在每个子类里重复同样的代码，也不需要按类型名 `switch`。

#### 值对象

`Decimal` 是不可变的数值类型，几何属性、画布尺寸、move 的位移和 scale 的倍数都用它表示。它按 SVG 的数值语法解析文本，输出时最多保留 6 位小数并去掉 `-0`，所以 `0.1 + 0.2` 显示为 `0.3`。方法签名里写 `Decimal` 就说明这个值已经校验过。

#### 简单工厂

`ShapeFactory` 把类型名映射到图形类，`create` 命令和 `read` 读文件共用。这是题目允许的两处按名分派之一，标注为待重构（见 1.5）。

#### 局部备忘录与迭代器

接收者 `SvgDocument` 的每个编辑方法都返回一个备忘录（`Memento` 接口，只有 `restore()`），命令只负责保管，undo 时调用 `restore()`：

| 备忘录             | 保存的内容                       | 用于                               |
| ------------------ | -------------------------------- | ---------------------------------- |
| `GeometryMemento`  | 一个叶子的几何属性值             | move、scale（容器由 Journal 组合） |
| `Placement`        | 一个图形当时的父容器和下标       | create、delete、addto、front、back |
| `AttributeMemento` | 一个属性的旧值（或"原来没有"）   | set                                |
| `Journal`          | 多个备忘录，按从新到旧的顺序恢复 | group、ungroup                     |

`Journal` 中的每个 `Placement` 都在对应那一步执行之前记录，下标反映的是当时的状态，所以倒序恢复能精确还原（见过程记录 6）。

`Shape.walk()` 是生成器，按先序遍历子树，配合 ES2025 的迭代器辅助方法完成 id 查找、元素计数和成环检查。

#### 考虑过但没有采用

- Visitor：tree 输出和序列化看上去适合 Visitor，但课件给出的适用条件是"元素类型稳定、操作多变"。本题下一阶段会通过插件增加 `box` 等类型，每加一种类型所有 Visitor 都要改，和"内核新增代码为 0"的目标冲突。所以改为让每种图形自己提供摘要和属性列表，写出器和 tree 排版只做通用处理。
- Observer：目前只有 CLI 一个视图，等 GUI 阶段需要画布随文档刷新时再加。
- Singleton：各对象由 `main.ts` 组装后注入，测试时可以直接构造新实例。

### 1.3 依赖方向规则

| 模块    | 允许依赖                                                                 | 理由                                                                 |
| ------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| domain  | 无（不引入 `node:*`、Bun API 或任何库）                                  | 最稳定、复用最多，各种输入通道和插件阶段都建在它上面                 |
| io      | domain、`node:fs`、fast-xml-parser、fast-xml-validator、fast-xml-builder | 文件格式和解析库的变化不影响模型                                     |
| command | domain、io                                                               | 用例层。command 直接依赖 io 是有意保留的（题目允许本阶段 IO 未隔离） |
| cli     | command、domain、commander、`node:readline` 等（`node:fs` 除外）         | 只是输入通道之一，不直接读写文件                                     |

规则：依赖只能指向更稳定的模块；不允许循环依赖；跨模块导入一律写成 `#domain/…`、`#command/…` 这样的路径别名（package.json 的 `imports` 字段），禁止 `../` 相对导入，这样每一行 import 都能直接看出依赖方向。

执行方式：上表写在 `.oxlintrc.json` 中按目录覆盖的 `no-restricted-imports` 规则里，另有 `import/no-cycle`。编辑器、pre-commit 钩子和 CI 都运行 oxlint，违反规则的依赖无法提交，题目所说的"待处理项"在提交前就会暴露。

### 1.4 变化点假设

| #   | 可能的变化                              | 为它留了什么                                                                                                                                                                                                         | 没留什么，为什么                                                   |
| --- | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 1   | 插件增加图形类型（题目 4.4 的 `box`）   | 每种图形的行为都在自己的类里；写出器和 tree 排版不认识具体类型；help 中 create 的参数表由各图形的 `createSignature()` 生成，新类型注册后自动出现；读入时未知属性原样保留，`data-kind="box"` 在本阶段读回再保存不会丢 | 插件注册表和加载机制。本阶段只有内置类型，提前做只能凭猜测设计接口 |
| 2   | 增加新命令                              | 一条命令一个类；help 文本由 commander 根据注册信息生成                                                                                                                                                               | 命令自动注册。集中注册更直观，也是题目要求标注的待重构点           |
| 3   | 新的输入通道（agent、鼠标）             | domain 和 command 不接触终端；命令返回纯文本反馈，agent 也能直接读                                                                                                                                                   | Observer 等事件机制。还没有第二个视图                              |
| 4   | 存储格式变化、IO 需要隔离               | 文件与 XML 相关代码全部在 io                                                                                                                                                                                         | `DocumentStore` 之类的接口。目前只有一种实现，接口只会多一层转发   |
| 5   | 寻址方式扩展（题目提到的类 XPath 路径） | 所有查找都经过 `SvgDocument.find`                                                                                                                                                                                    | 路径解析本身，本阶段不要求                                         |

### 1.5 待重构标注

| 位置                         | 现状                                   | 计划                                                                  |
| ---------------------------- | -------------------------------------- | --------------------------------------------------------------------- |
| `src/cli/CliProgram.ts`      | 命令名到命令类的分发（commander 注册） | 插件化阶段改为由命令提供者注册                                        |
| `src/domain/ShapeFactory.ts` | 类型名到图形类的分发                   | 替换为 `ShapeProvider` 注册表                                         |
| command 直接依赖 io          | IO 未隔离                              | 出现第二种存储方式或需要替身测试时，在 command 中定义接口，由 io 实现 |

代码里这几处都有 `待重构` 注释，`grep -rn 待重构 src` 可以找到。

### 1.6 修订记录

| 日期       | 改动                                                                                    | 原因                                                                                                                  |
| ---------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 2026-10-24 | 初版方案                                                                                |                                                                                                                       |
| 2026-10-24 | 数值处理从静态工具类改为 `Decimal` 值对象                                               | oxlint 报告只有静态成员的类，见过程记录 5                                                                             |
| 2026-10-24 | tree、show 的排版从 cli 移到 command，成为显示类命令                                    | 它们和编辑命令一样是用例，agent 等其他输入通道也要用。留在 cli 的话，别的通道只能依赖 cli 或者重写一遍                |
| 2026-10-24 | 端到端测试从"进程内回放加一个冒烟测试"改为全部用真实进程回放                            | 会话里有 save 和 read，每个会话需要自己的工作目录。子进程可以单独指定工作目录，进程内回放只能改全局的 `process.chdir` |
| 2026-10-25 | io 改用 fast-xml-validator 检查 XML 格式、fast-xml-builder 写出；lint 开启弃用 API 检查 | fast-xml-parser 的 `XMLValidator` 和 `XMLBuilder` 已标记为弃用，见过程记录 14                                         |

## 2 过程记录

与 AI（Claude Code）协作中有代表性的讨论与修正，按时间顺序：

1. 规划阶段：读题目时发现三处 tree 示例的列对齐方式不一致。5.1 节和第 6 节是"最长标签加 2 个空格"，4.4 节是"加 1 个空格"，6.1 节版本 A 还有一行只空了 1 格，没有一条规则能同时满足。决定采用第一种，端到端测试比较输出时把连续空白视为一个空格。
2. 规划阶段：调研工具时发现 TypeScript 7.0 不再提供编译器 API，依赖它的 dependency-cruiser 和 typescript-eslint 用不了，于是改用 oxlint 的 `no-restricted-imports` 按目录检查依赖方向。
3. 规划阶段：方案比较了 undo 的两种做法。move 和 scale 的反向运算（减去位移、乘 1/f）有浮点误差，所以这两条命令保存受影响图形的几何备忘录，其余命令保存位置信息或旧值。
4. 规划阶段：考虑过用 Visitor 实现 tree 输出和序列化，因下一阶段会持续增加图形类型而放弃（见 1.2）。
5. 图形类实现：AI 起初把数值的解析和格式化写成只有静态方法的 `Numbers` 类。oxlint 的 `typescript/no-extraneous-class` 报错，并建议改成独立函数，而题目禁止自由函数。只有静态方法的类其实就是套了一层类的自由函数，所以改成 `Decimal` 值对象：解析、运算和输出都是数值自己的方法。
6. 接收者实现：方案只写了"结构类命令保存 Placement，逆序恢复"。实现 group 时用六个兄弟节点 a 到 f 推演 `group g e a c`：如果执行前一次性记下所有成员的下标，倒序恢复后 e 和 f 的顺序会颠倒，因为新容器插入后其余节点的下标已经变了。改为每一步执行前才记录 `Placement`，测试 "members keep document order" 覆盖这个例子。
7. 结构类命令实现：随机命令序列的性质测试（全部 undo、全部 redo 都能回到对应状态）一直通过，但用 `fc.sample` 统计生成的序列后发现，ungroup 和 addto 几乎没有成功执行过：起始文档里没有容器，随机序列很少先造出嵌套容器，这两条命令基本都在报错。测试通过只证明了"失败的命令不改状态"。改为从带两层嵌套容器的文档开始，扩大 id 的取值范围，运行次数加到 500。
8. CLI 实现：写 `CliProgram` 之前先用小脚本试了 commander 15 的几个行为。负数（`move c1 -30 0`）会被当作参数，`-hi` 这样以减号开头的文字却会被当成未知选项报错，所以每个子命令都打开了 `allowUnknownOption()`。commander 的错误信息带 `error: ` 前缀，"Did you mean" 提示在第二行；`CliProgram` 去掉前缀并合成一行，符合题目"一行一条"的约定。
9. REPL 实现：终端模式的测试把几行输入和 Ctrl+C 一起送进 readline，第一次运行就失败在 `ERR_USE_AFTER_CLOSE`。Ctrl+C 之前送进去的行仍会逐行执行，执行完再调用 `prompt()` 时 readline 已经关闭，`start()` 因异常结束，REPL 随之退出。改为收到 close 事件后不再提示。修正后 Tab 补全仍没有触发，原因是 readline 把一个数据块里的多个字符当作粘贴处理，只在块的最后一个字符上启用补全；测试改为每个按键单独一块，和真人打字一致。
10. 读写实现：方案把"fast-xml-parser 的输出能否与题目 0.1 节的示例逐字节一致"列为风险。先用小脚本验证：缩进、自闭合标签和 XML 声明都一致，只差文件末尾的换行，所以保留这个库，没有手写写出器。读入时库返回 `any`，AI 起初用 `as` 把结果直接断言成节点类型，oxlint 的 `no-unsafe-type-assertion` 报错。改为运行时检查（`Array.isArray`，属性按 `typeof` 过滤后放进 `Map`），形状不对的数据不会带着错误的类型进入领域层。
11. 读写实现：去掉 UTF-8 BOM 的正则里，AI 两次把 `\uFEFF` 写成了真正的 BOM 字符。第一次是编辑工具把转义解码了；第二次想用 sed 修正，GNU sed 又把替换文本里的 `\u` 理解成"下一个字母大写"，得到 `FEFF`。代码的行为没有错，但源码里多了一个看不见的字符，是用 `od -c` 查看字节时才发现的。oxlint 的 `no-irregular-whitespace` 不检查正则和字符串内部，抓不到这种情况。最后改用 `trimStart()`：JavaScript 把 U+FEFF 算作空白，源码里不必出现这个字符。之后扫描了全部源码和测试，没有别的不可见字符。后来变异测试（过程记录 13）显示，把 `trimStart()` 换成 `trimEnd()` 测试照样通过。用小脚本验证后确认 fast-xml-parser 本身就接受开头的 BOM，这行代码从一开始就不需要，已删除；BOM 测试保留，库的行为如果变了它会失败。
12. 变异测试：方案中的 Stryker 社区 Bun 运行器要求 `typescript <7`，所以改用 Stryker 自带的 command 运行器，每个变异体跑一遍 `bun test`。第一次运行在测试开始前就崩溃了：`TypeError: ts.parseConfigFileTextToJson is not a function`。原因在 Stryker core：它会在沙箱里改写 tsconfig.json 中指向沙箱外的 `extends` 和 `references`，这一步要调用 TypeScript 的编译器 API，而 TypeScript 7 没有这个 API（与过程记录 2 同一原因）。当时最新的 10.1.1 这部分代码没有变，升级解决不了。本项目的 tsconfig.json 没有 `extends` 和 `references`，改写不会改动任何内容，所以在 `stryker.config.json` 里用 `ignorePatterns` 不把它复制进沙箱，预处理器找不到文件就会跳过。Bun 运行测试不做类型检查，沙箱里少了这个文件，测试照样全部通过（Stryker 植入变异之前会先完整跑一遍测试确认）。另外 knip 把配置里的 command 运行器报成了缺失的依赖 `@stryker-mutator/command-runner`。npm 上没有这个包，运行器就在 core 里，所以在 knip.json 里忽略它并注明原因。
13. 变异测试：第一次运行得分 92.01%（1102 个变异体，存活 88 个），而行覆盖率是 100%。逐个看了存活的变异体，其中 22 个对应测试真正漏掉的地方。没有测试解析过 `12.5`、`.25`、`1E-3`、`2e10` 这类数，SVG 数值语法的正则改坏了也发现不了；没有测试设置过 `stroke-width`；读入时同一类型的两个无 id 元素（应编为 rect1、rect2）、只写了 width 或只写了 height 的根元素、用同一个 `SvgReader` 读第二个文件（`Workspace` 正是这样用的）都没有测试；所有执行器测试都先执行 init，执行器刚创建时的状态从来没有被检查过。终端模式的测试有一个不容易看出的问题：它一次送进全部按键，readline 在 REPL 处理第一行之前就因为 Ctrl+C 关闭了，所以"每条命令之后重新出现提示符"从来没有被检查过。新加的测试像人一样，等 REPL 回答之后才结束输入。commander 自己也会往 stderr 打印错误，`configureOutput` 把它关掉了，但没有测试确认，于是端到端测试加了一个语法错误的脚本，检查 stderr 为空。另外有两行代码删掉后测试照样通过：去掉 BOM 的 `trimStart()`（见过程记录 11），以及 Ctrl+C 时关闭 readline 的监听器。用小脚本验证过，readline 没有监听器时自己就会关闭，所以两行都删了。补测试、删代码之后重新运行，得分 94.27%，剩下 63 个存活变异体的分类见 4.2 节。
14. 弃用 API：用户在编辑器里看到了 `XMLValidator` 的弃用提示（TypeScript 6385）。第 8 步 AI 选用了 fast-xml-parser 自带的 `XMLValidator` 和 `XMLBuilder`，当时没有发现它们已被标记为弃用。TypeScript 只在编辑器里把弃用显示为提示，`tsc` 不会报错，lint 也没有开启相应的规则，所以检查一直是绿的。随后用 oxlint 的 `typescript/no-deprecated` 扫描了全部源码和测试，只找到这两处，分别换成了弃用说明里推荐的 fast-xml-validator 和 fast-xml-builder（fast-xml-parser 自己就依赖 fast-xml-builder）。新的校验器出错时会抛出带行号的异常，而它的类型声明还是旧的"返回错误对象"的写法，所以捕获代码按实际行为编写。这条规则现在设为 error，以后再用到弃用的 API，提交和 CI 都会失败。依赖规则里按包名写的 `fast-xml-parser` 也改成了 `fast-xml-`，新加的两个包同样受模块边界约束；domain 和 command 还补上了之前漏掉的 `@commander-js/`。

## 3 一致性自查

2026-10-25 实现完成后，对照第 1 节逐条检查了代码。每一项都写了检查方法，可以在仓库根目录重新运行。

### 3.1 模块与依赖方向

| 模块    | 实际导入（`grep -rhoE "from '[^']+'" src/<模块>`，去重）                                   | 结论                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| domain  | `#domain`                                                                                  | 与 1.3 节一致，没有 `node:*`、Bun API 或任何库                                                              |
| io      | `#domain`、fast-xml-builder、fast-xml-parser、fast-xml-validator、`node:fs`                | 一致                                                                                                        |
| command | `#command`、`#domain`、`#io`                                                               | 一致                                                                                                        |
| cli     | `#cli`、`#command`、`#domain`、`@commander-js/extra-typings`、`node:readline`、`node:util` | 一致，没有 `node:fs`。`@commander-js/extra-typings` 是 commander 官方的类型增强包，运行时用的就是 commander |
| main.ts | `#cli`、`#command`                                                                         | 组装入口，不受 1.3 节限制                                                                                   |

模块划分与 1.1 节一致，唯一的改动（tree、show 移到 command）已记在 1.6 节。oxlint 的 `import/no-cycle` 通过，没有循环依赖。

### 3.2 依赖规则确实会拦下违规

为了确认规则不只是写在配置里，临时在 domain 中加了一个同时违反三条规则的文件 `src/domain/Probe.ts`：导入 `node:fs`，导入 cli 的类，用 `../` 跨模块导入。oxlint 报出三个错误并以退出码 1 结束，pre-commit 钩子和 CI 都会因此失败：

```text
src/domain/Probe.ts:1:1: error eslint(no-restricted-imports): 'node:fs' import is restricted from being used by a pattern. help: domain does no IO and uses no libraries.
src/domain/Probe.ts:3:1: error eslint(no-restricted-imports): '#cli/Repl.ts' import is restricted from being used by a pattern. help: domain must not depend on any other module.
src/domain/Probe.ts:5:1: error eslint(no-restricted-imports): '../command/Workspace.ts' import is restricted from being used by a pattern. help: Cross-module imports must use the #domain/ #command/ #io/ #cli/ aliases.
```

检查完已删除这个文件。

### 3.3 面向对象与命令模式的规则

| 规则                           | 检查方法                                                                                          | 结果                                                                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 一个文件一个类，文件名就是类名 | oxlint 的 `max-classes-per-file`、`unicorn/filename-case`；另用脚本比对每个文件导出的类名与文件名 | src 下 48 个文件：46 个各有一个同名的类，`Memento.ts` 是同名接口，`main.ts` 是唯一没有类的文件                                                               |
| 没有自由函数                   | `grep -rnE "^(export )?function\|^(export )?const \w+ = \(" src`                                  | 没有匹配                                                                                                                                                     |
| 不按图形类型分派               | `grep -rnE "instanceof\|switch *\(" src`                                                          | 没有 `switch`。`instanceof` 有 4 处，都只用来区分错误类型（`EditorError`、`CommanderError`）；判断是否为容器用多态的 `asGroup()`                             |
| 按名称分派只有两处             | 阅读代码，找字符串到类或命令的映射                                                                | 只有 `ShapeFactory` 的类型表和 `CliProgram` 的 commander 注册，都标了 `待重构`                                                                               |
| 封装                           | 检查各个类的字段                                                                                  | 实例状态都在 `#` 私有字段里；公开字段只有各图形类的 `readonly tag`，是常量                                                                                   |
| 具体命令只转发，不做校验       | `grep -rln "throw " src/command`，并逐个阅读命令类                                                | 会抛错的只有 `Workspace`（接收者）和 `CommandExecutor`（调用者）。调用者抛出的 `nothing to undo` 和 `undo not allowed after io command` 属于历史栈自己的规则 |
| 命令不打印                     | `grep -rnE "console\.\|process\.std" src/domain src/command src/io`                               | 没有匹配，只有 `Repl` 和 `main.ts` 接触输入输出                                                                                                              |
| undo 不做整文档快照            | `grep -rnE "serialize\|structuredClone\|clone" src/command src/domain`，并阅读各命令的 undo       | 没有匹配，command 里只有 `Workspace` 为 save 持有 `SvgWriter`。各命令只保存 1.2 节表中的备忘录                                                               |

### 3.4 对照题目

| 题目内容                         | 验证方式                                                                           |
| -------------------------------- | ---------------------------------------------------------------------------------- |
| 第 6 节、6.1 节版本 A 的完整会话 | 端到端测试用真实进程逐行回放，保存出的文件与期望文件逐字节比较                     |
| 5.1、5.2 节 tree 和 show 的示例  | 命令层测试逐字符比较                                                               |
| 0.1 节的示例 SVG                 | 读入再写出，与原文逐字节一致                                                       |
| 4.2、4.3 节的错误信息            | 共 13 条。`cannot ungroup composite shape` 属于 `box` 插件阶段，其余 12 条都有测试 |
| 4.4 节和 6.1 节版本 B 的 `box`   | 属于下一阶段，本阶段没有实现                                                       |

### 3.5 自查中发现的不一致

1.5 节写着"代码里这几处都有 `待重构` 注释"，检查时发现只有两个分派点有，"command 直接依赖 io"这一处没有。已在 `Workspace.ts` 补上注释，现在 `grep -rn 待重构 src` 能找到全部三处。

## 4 质量保证手段

### 4.1 手段

| 层次         | 内容                                                                                                                                                                         | 工具                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| 接收者       | `SvgDocument` 与各图形类的单元测试，覆盖题目 4.2 节中本阶段适用的每条错误信息                                                                                                | bun:test                     |
| 命令与执行器 | 每条编辑命令：执行前的 SVG 文本等于 undo 后的文本，执行后的文本等于 redo 后的文本；栈规则与 IO 屏障；随机命令序列的性质测试                                                  | bun:test、fast-check         |
| IO           | 自动补 id 不与文件中后出现的 id 冲突、重复 id、读写往返、题目示例逐字节一致                                                                                                  | bun:test                     |
| 端到端       | 题目第 6 节和 6.1 节（版本 A）的会话原样作为测试数据，用真实进程逐行回放；保存出的文件与按题目推导的期望文件逐字节比较。另有一个语法错误的脚本，确认错误只在 stdout 打印一行 | bun:test、`Bun.spawn`        |
| 静态检查     | 格式、lint（含依赖规则和弃用 API 检查）、TypeScript 严格模式、无用代码检查、覆盖率阈值（行与函数 90%）                                                                       | oxfmt、oxlint、tsc、knip     |
| 变异测试     | 在源码里逐个植入小改动（变异体），每个变异体跑一遍全部测试，看测试能否发现。它检验的是测试本身：覆盖率只说明代码被执行过，不说明结果被检查过                                 | Stryker 10（command 运行器） |

pre-commit 钩子运行格式检查、lint 和类型检查；GitHub Actions 在每次推送时运行 `bun run check`。变异测试要跑约 3 分钟，没有放进钩子和 CI，用 `bun run mutation` 手动运行。

### 4.2 结果（2026-10-25）

| 指标         | 结果                                                                                                                                                                                 |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 测试         | 114 个：domain 49、command 35、io 16、cli 11、端到端 3。断言约 3700 次，性质测试的命令序列是随机生成的，每次运行的断言数略有不同                                                     |
| 覆盖率       | 行 100%，函数 99.94%。唯一不到 100% 的是 `CliProgram.ts`（函数 97.06%）：交给 commander 的 `writeOut` 是空函数，commander 只在自己输出帮助时调用它，而 help 命令是取出帮助文本再返回 |
| 性质测试     | 500 次，每次最多 30 条随机编辑命令，起始文档带两层嵌套容器；全部 undo 回到初始 SVG，全部 redo 回到最终 SVG                                                                           |
| 题目错误信息 | 本阶段适用的 12 条都有测试（见 3.4）                                                                                                                                                 |
| 变异测试     | 第一次 1102 个变异体，存活 88 个，得分 92.01%。按结果补了测试、删掉两行多余代码之后是 1099 个，存活 63 个，得分 94.27%，没有超时和未覆盖的变异体（过程记录 13）                      |
| 静态检查     | oxlint（类型感知，警告也算失败）、tsc 严格模式、knip 都没有发现问题                                                                                                                  |

剩下的 63 个存活变异体逐个看过，改了都不会产生可观察的差别：

| 类别                      | 数量 | 例子                                                                                                                    |
| ------------------------- | ---- | ----------------------------------------------------------------------------------------------------------------------- |
| 防御性的空值判断          | 21   | undo 中的 `this.#memento?.restore()`。undo 只会在 execute 之后调用，备忘录一定存在；文档中的图形也一定有父容器          |
| 结果相同或走不到的分支    | 15   | `?? ''` 兜底（切分参数的正则每次匹配总有一组有值）；`#warnings` 的初始值（每次解析前都会清空）；画布的 id（从不被查找） |
| 用户看不到的文字          | 9    | commander 的参数说明（help 只显示参数名）、程序名、`EditorError.name`                                                   |
| 库已经保证的行为          | 15   | fast-xml-parser 已经去掉属性值两端的空白；解析结果中标签名总在 `':@'` 之前；属性值总是字符串                            |
| 只在别处有 bug 时才起作用 | 3    | 把意外的异常原样抛出，而不是包装成用户错误                                                                              |

要杀死这些变异体，只能去测试实现细节或者故意制造 bug，所以没有再补测试。

### 4.3 这些手段拦下的问题

| 手段               | 拦下的问题                                                                                            |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| pre-commit 钩子    | 第 2 步提交时 tsc 报 TS18048（`Leaf.movedPhrase` 中的值可能是 `undefined`），提交被拒绝，修正后才提交 |
| oxlint             | 只有静态方法的类（过程记录 5）；对库返回值的不安全类型断言（过程记录 10）                             |
| 统计生成的测试数据 | 性质测试几乎没有执行 ungroup 和 addto（过程记录 7）                                                   |
| 变异测试           | 覆盖率 100% 时仍然漏掉的测试，以及两行多余的代码（过程记录 13）                                       |
| 一致性自查         | 1.5 节与代码不符（3.5）                                                                               |

## 附录 A 题目未明确之处与本实现的约定

| #   | 问题                                      | 约定                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | tree 示例的列对齐方式不一致               | 摘要列对齐到"最长标签 + 2 个空格"                                                                                                                                                                                                                                                                                                                                                                               |
| 2   | `group` 的新容器放在哪里，成员按什么顺序  | 新容器放在第一个成员（按文档顺序）原来的位置；成员保持文档中的相对顺序                                                                                                                                                                                                                                                                                                                                          |
| 3   | 部分命令的成功反馈没有给出格式            | 实现时统一补全，列在本附录末尾                                                                                                                                                                                                                                                                                                                                                                                  |
| 4   | 读入文件中的不支持元素、重复 id、格式错误 | 不支持的元素连同其子元素跳过：`warning: skipped <path id="p1">: unsupported element`。重复 id 按缺失处理：`warning: assigned id rect2 to <rect> with duplicate id r1`；自动编号跳过文件中任何位置已有的 id。属性值无法使用的元素也跳过，例如带单位的数值：`warning: skipped <rect id="r1">: invalid number: 10px`。叶子元素里的子元素（如 `<text>` 里的 `<tspan>`）跳过并警告。XML 格式错误时报错，当前文档不变 |
| 5   | tree 中显示哪些属性                       | 几何属性加 fill。题目示例里用 black 创建的 line 在 tree 中不显示 stroke                                                                                                                                                                                                                                                                                                                                         |
| 6   | init 之后无参数 `save`                    | `error: no file name. use 'save <file.svg>'`。`save <file>` 之后，无参数 `save` 写到这个新文件（与常见编辑器的"另存为"一致）；`init` 会清掉记住的文件                                                                                                                                                                                                                                                           |
| 7   | IO 屏障之后 undo 能否越过它               | 不能，文档类命令会清空 undo/redo 历史                                                                                                                                                                                                                                                                                                                                                                           |
| 8   | ungroup、addto 的参数找不到或不是容器     | addto 的容器参数与 `in` 子句相同：`no such container: x`、`not a container: x`。ungroup 的参数是操作对象本身，按普通 id 处理：找不到时 `no such shape: x`，不是容器时 `not a container: x`                                                                                                                                                                                                                      |
| 9   | addto 把容器移进它自己或它的子孙          | 与 group 相同：`cannot group a container into its own descendant: x`                                                                                                                                                                                                                                                                                                                                            |
| 10  | group 的 id 列表有重复                    | 去重后处理                                                                                                                                                                                                                                                                                                                                                                                                      |
| 11  | create 参数个数不对                       | `usage: create rect <id> <x> <y> <width> <height> [fill] [in <containerId>]`（按类型生成）                                                                                                                                                                                                                                                                                                                      |
| 12  | 数值和 id 的合法性                        | 数值按 SVG 数值语法解析，否则 `invalid number: x`；尺寸（width、height、r、rx、ry）为负时 `r must not be negative`；画布尺寸必须为正；id 不能为空或含空白，否则 `invalid id: "x"`                                                                                                                                                                                                                               |
| 13  | 命令语法错误（未知命令、参数缺少或多余）  | 沿用 commander 的信息，去掉 `error: ` 前缀并合成一行，例如 `error: unknown command 'mvoe' (Did you mean move?)`、`error: missing required argument 'dy'`                                                                                                                                                                                                                                                        |
| 14  | 以 `-` 开头的参数                         | 一律当作参数，负数和文字都可以；本程序没有选项                                                                                                                                                                                                                                                                                                                                                                  |
| 15  | 双引号内能否再写双引号                    | 不能。两个双引号之间的内容原样作为一个参数，不支持转义                                                                                                                                                                                                                                                                                                                                                          |
| 16  | 程序自身出错（bug）                       | 输出 `error: internal: ...`，会话继续                                                                                                                                                                                                                                                                                                                                                                           |
| 17  | read 失败时的信息                         | 文件不存在或不可读：`cannot read file: a.svg`。能读到但用不了时在括号里给出原因：`(line 1: Expected closing tag 'g' ...)`、`(no <svg> root element)`、`(<svg> has no width and height)`                                                                                                                                                                                                                         |
| 18  | 读入再保存，文件会有哪些变化              | 注释丢弃；属性按 id、几何、fill、stroke、stroke-width、其余属性的顺序重排；数值规范化（`0.50` 写成 `0.5`）；根元素的 viewBox 按 width、height 重新生成，width、height 缺失时取 viewBox 的尺寸。本程序自己保存的文件读回再保存逐字节不变                                                                                                                                                                         |
| 19  | `canvas` 只给一个参数                     | 只改宽度，高度不变（`init` 只给一个参数时高度取默认的 600）                                                                                                                                                                                                                                                                                                                                                     |

### 成功反馈一览

题目第 2 节只规定"编辑类命令回显结果摘要"，第 6 节的会话给出了一部分格式。"来源"一列中，"题目"指第 6 节会话里出现过的格式，"本实现"指按同样的风格补全的格式。

| 命令        | 执行与 redo                                                                                  | undo                                                                                                   | 来源                                     |
| ----------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| init        | `canvas 800x600 created`                                                                     | 文档类命令，不能 undo                                                                                  | 题目                                     |
| create      | `rect#bg created`；带 `in` 时 `rect#start created in g#node1`                                | `rect#bg removed`                                                                                      | 执行：题目；undo：本实现                 |
| delete      | `rect#box deleted`                                                                           | `rect#box restored into g#markers`                                                                     | 题目                                     |
| move        | 叶子 `circle#c1 moved to (130,100)`；容器 `g#node2 moved by (0,100)`                         | `circle#c1 moved back to (100,100)`；`g#node2 moved back by (0,-100)`                                  | 题目                                     |
| scale       | `circle#c1 scaled by 3`                                                                      | `circle#c1 scaled back by 1/3`                                                                         | 本实现                                   |
| set         | `text#title updated: text="My Diagram v2"`；`rect#r1 updated: fill="red"`                    | 写回旧值：`text#title updated: text="My Diagram"`；原来没有这个属性：`rect#r1 updated: stroke removed` | 题目；原来没有属性的情况：本实现         |
| group       | `g#markers created with 2 children`；一个成员时 `created with 1 child`                       | `g#markers ungrouped`                                                                                  | 执行：题目（单数：本实现）；undo：本实现 |
| ungroup     | `g#inner ungrouped`                                                                          | `g#inner regrouped`                                                                                    | 本实现                                   |
| addto       | `rect#bg moved into g#markers`                                                               | `rect#bg moved back into svg`                                                                          | 本实现                                   |
| front、back | `rect#r1 brought to front`、`rect#r1 sent to back`                                           | `rect#r1 z-order restored`                                                                             | 本实现                                   |
| canvas      | 不带参数：`canvas 800x600`；改尺寸：`canvas resized to 1024x768`                             | 改尺寸是文档类命令，不能 undo                                                                          | 本实现                                   |
| save        | `saved to demo.svg (5 elements)`；一个元素时 `(1 element)`                                   | 不能 undo                                                                                              | 题目（单数：本实现）                     |
| read        | 先逐行输出警告 `warning: ...`（格式见本附录第 4 行），最后一行 `read other.svg (7 elements)` | 不能 undo                                                                                              | 题目                                     |

redo 重新执行命令，反馈与执行时相同，题目第 6 节也是这样。没有可以 undo 或 redo 的操作时报 `error: nothing to undo`、`error: nothing to redo`（本实现）；文档类命令之后报题目规定的 `error: undo not allowed after io command`。
