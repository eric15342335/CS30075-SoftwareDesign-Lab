# SVG 编辑器（CLI）

[![CI](https://github.com/eric15342335/CS30075-SoftwareDesign-Lab/actions/workflows/ci.yml/badge.svg)](https://github.com/eric15342335/CS30075-SoftwareDesign-Lab/actions/workflows/ci.yml)

这是 CS30075 软件设计课程 Lab1 的作业，现在完成到第二阶段（Phase 2，tag `p2`）：VSCode 扩展实践，以及 CLI 的插件式重构。

- Phase 2 的题目：[doc/pj1-phase2/phase_cli_2.md](doc/pj1-phase2/phase_cli_2.md)。设计文档、过程记录、自检和质量保证：[doc/README.md](doc/README.md)。度量结果：[docs/metrics/](docs/metrics/README.md)。
- Phase 1（tag `final`）的题目：[doc/pj1-phase1/phase_cli_1.md](doc/pj1-phase1/phase_cli_1.md)。设计文档：[doc/pj1-phase1/README.md](doc/pj1-phase1/README.md)。

## 运行

运行本程序需要 [Bun](https://bun.sh) 1.4 或更新的版本。安装方法如下：

- Windows：`powershell -c "irm bun.sh/install.ps1 | iex"`
- macOS / Linux：`curl -fsSL https://bun.sh/install | bash`

```bash
bun install
bun run cli
```

`bun run cli` 用 `app/main.ts` 里列出的插件启动（方式 A）。`bun run cli --config plugins.config.json` 按配置文件装插件（方式 B），`bun run cli --no-plugins` 只装 Phase 1 的内置能力。四个插件（`stats`、`dir`、`box`、`modified-star`）在 `plugins/` 里。

如果 PATH 中有 bun，`npm run cli` 也能启动程序。把命令写进一个文本文件以后，就可以用 `bun run cli < script.txt` 一次回放全部命令。

```bash
bun run check
```

这条命令依次运行格式检查、lint、类型检查、knip，以及带覆盖率阈值的测试。其中 lint 也包括模块依赖规则。端到端测试会启动真实的进程：`test/e2e/Transcripts.test.ts` 逐行回放 Phase 1 题目第 6 节和第 6.1 节版本 A 的会话，`test/e2e/BoxSession.test.ts` 回放版本 B，`test/e2e/Assembly.test.ts` 检查两种装配方式的输出逐字节相同。

```bash
bun run mutation
```

这条命令用 Stryker 做变异测试，对内核、插件宿主和插件生成变异体。运行完后，报告保存在 `reports/mutation/index.html`。

如果想手动试一试读入文件，可以在 REPL 里先输入 `read test/fixtures/other.svg`，再输入 `tree`。

如果 Windows 终端里的中文显示成乱码，请先执行 `chcp 65001`。
