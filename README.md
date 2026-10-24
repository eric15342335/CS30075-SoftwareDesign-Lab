# SVG 编辑器（CLI）

CS30075 软件设计 Lab1 Phase 1。题目见 [phase_cli_1.md](phase_cli_1.md)，架构方案、过程记录、一致性自查与质量保证手段见 [doc/README.md](doc/README.md)。

## 运行

需要 [Bun](https://bun.sh) 1.4 或更新版本：

- Windows：`powershell -c "irm bun.sh/install.ps1 | iex"`
- macOS / Linux：`curl -fsSL https://bun.sh/install | bash`

```bash
bun install
bun run cli
```

`npm run cli` 也可以启动（前提是 PATH 中有 bun）。把命令写进文本文件后可以整段回放：`bun run cli < script.txt`。

```bash
bun run check
```

依次运行格式检查、lint（含模块依赖规则）、类型检查、knip 和带覆盖率阈值的测试。

Windows 终端中文乱码时，先执行 `chcp 65001`。
