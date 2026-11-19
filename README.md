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

`bun run cli < script.txt` 一次回放文件里的全部命令。

```bash
bun run check
```

这条命令运行格式检查、lint（含模块依赖规则）、类型检查、knip 和带覆盖率阈值的测试。端到端测试启动真实的进程，回放题目里的会话，并检查两种装配方式的输出逐字节相同。

```bash
bun run mutation
```

这条命令用 Stryker 做变异测试，报告在 `reports/mutation/index.html`。

手动试读入文件：在 REPL 里输入 `read test/fixtures/other.svg`，再输入 `tree`。Windows 终端里中文乱码时，先执行 `chcp 65001`。
