# Agent guide

SVG editor CLI for CS30075 Lab1 Phase 1. The spec is `phase_cli_1.md`. Architecture, process log, self-check and QA live in `doc/README.md` (Chinese).

## Commands

- `bun install`
- `bun run cli`: start the REPL
- `bun test`: run the tests
- `bun run check`: everything CI runs (format check, lint with architecture rules, type check, knip, tests with coverage thresholds)
- `bun run fmt` formats; `bunx oxlint --fix` applies lint fixes

## Rules the code must follow (they are graded)

- OOP: class hierarchy and polymorphism, encapsulated `#private` fields, one class per file, file name = class name. No anemic data classes, no free functions, no `switch` or `instanceof` dispatch on shape type.
- Name-based dispatch exists in exactly two places, both marked `// 待重构`: `src/cli/CliProgram.ts` (command name to command) and `src/domain/ShapeFactory.ts` (type name to class).
- Containers and leaves support the same operations (Composite).
- Command pattern: a concrete command only forwards to its receiver (`SvgDocument` or `Workspace`). Validation and the spec's error messages live in the receiver. Undo stores the minimum prior state (`GeometryMemento`, `Placement`, old values). Never snapshot the whole document.
- Commands are synchronous and never print. They return feedback lines; only `src/cli/Repl.ts` and `src/main.ts` touch stdin/stdout.

## Module boundaries (oxlint `no-restricted-imports` enforces them)

| Module  | May import                                            |
| ------- | ----------------------------------------------------- |
| domain  | nothing: no `node:*`, no Bun, no packages             |
| io      | domain, `node:fs`, fast-xml-parser                    |
| command | domain, io                                            |
| cli     | command, domain, commander, `node:*` except `node:fs` |

Cross-module imports use the `#domain/...`, `#command/...`, `#io/...`, `#cli/...` aliases. `../` imports are banned.

## Workflow

- Tests first (`bun:test`). Every spec error message and every spec transcript has a test.
- One step per commit with a conventional commit message (commitlint checks it).
- When an AI suggestion turns out wrong or the spec is unclear, add an entry to 过程记录 or 附录 A in `doc/README.md`. Plan changes go to 1.6 修订记录.
