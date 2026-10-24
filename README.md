# SVG 编辑器（CLI）

[![CI](https://github.com/eric15342335/CS30075-SoftwareDesign-Lab/actions/workflows/ci.yml/badge.svg)](https://github.com/eric15342335/CS30075-SoftwareDesign-Lab/actions/workflows/ci.yml)

这是 CS30075 软件设计课程 Lab1 第一阶段（Phase 1）的作业。题目在 [phase_cli_1.md](phase_cli_1.md) 里；架构方案、过程记录、一致性自查和质量保证手段写在 [doc/README.md](doc/README.md) 里。

## 运行

运行本程序需要 [Bun](https://bun.sh) 1.4 或更新的版本。安装方法如下：

- Windows：`powershell -c "irm bun.sh/install.ps1 | iex"`
- macOS / Linux：`curl -fsSL https://bun.sh/install | bash`

```bash
bun install
bun run cli
```

如果 PATH 中有 bun，`npm run cli` 也能启动程序。把命令写进一个文本文件，就可以用 `bun run cli < script.txt` 一次回放全部命令。

```bash
bun run check
```

这条命令依次运行格式检查、lint（包括模块依赖规则）、类型检查、knip，以及带覆盖率阈值的测试。端到端测试 `test/e2e/Transcripts.test.ts` 会启动真实的进程，逐行回放题目第 6 节和第 6.1 节（版本 A）中的会话。

```bash
bun run mutation
```

这条命令用 Stryker 做变异测试，大约需要 3 分钟，报告保存在 `reports/mutation/index.html`。

如果想手动试一试读入文件，可以在 REPL 里先输入 `read test/fixtures/other.svg`，再输入 `tree`。

如果 Windows 终端里的中文显示成乱码，请先执行 `chcp 65001`。
