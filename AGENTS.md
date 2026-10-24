# Agent guide

This repository holds an SVG editor CLI for CS30075 Lab1 Phase 1. The spec is `phase_cli_1.md`. The architecture, the process log, the self-check and the QA results are in `doc/README.md`, which is written in Chinese.

## Commands

- `bun install` installs the dependencies.
- `bun run cli` starts the REPL.
- `bun test` runs the tests.
- `bun run check` runs everything that CI runs: the format check, lint with the architecture rules, the type check, knip, and the tests with coverage thresholds.
- `bun run fmt` formats the code, and `bunx oxlint --fix` applies lint fixes.

## Rules the code must follow (they are graded)

- Use OOP: a class hierarchy with polymorphism, encapsulated `#private` fields, and one class per file, where the file name equals the class name. Do not write anemic data classes or free functions, and do not dispatch on the shape type with `switch` or `instanceof`.
- Name-based dispatch exists in exactly two places, and both are marked `// 待重构`. `src/cli/CliProgram.ts` maps a command name to a command, and `src/domain/ShapeFactory.ts` maps a type name to a class.
- Containers and leaves support the same operations (Composite pattern).
- Follow the Command pattern. A concrete command only forwards the request to its receiver (`SvgDocument` or `Workspace`). Validation and the spec's error messages live in the receiver. Undo stores the minimum prior state (`GeometryMemento`, `Placement`, or the old values). Never take a snapshot of the whole document.
- Commands are synchronous and never print. They return feedback lines, and only `src/cli/Repl.ts` and `src/main.ts` touch stdin and stdout.
- Do not use deprecated APIs. Oxlint's `typescript/no-deprecated` rule fails the check when code uses one. Use the replacement that the deprecation notice names.

## Module boundaries (oxlint `no-restricted-imports` enforces them)

| Module  | May import                                                               |
| ------- | ------------------------------------------------------------------------ |
| domain  | nothing: no `node:*`, no Bun, no packages                                |
| io      | domain, `node:fs`, fast-xml-parser, fast-xml-validator, fast-xml-builder |
| command | domain, io                                                               |
| cli     | command, domain, commander, `node:*` except `node:fs`                    |

Cross-module imports use the `#domain/...`, `#command/...`, `#io/...` and `#cli/...` aliases. Imports that start with `../` are banned.

## Workflow

- Write the tests first (`bun:test`). Every error message in the spec and every transcript in the spec has a test.
- Make one commit per step, with a conventional commit message (commitlint checks it).
- When an AI suggestion turns out to be wrong or the spec is unclear, add an entry to 过程记录 or 附录 A in `doc/README.md`. Record plan changes in 1.6 修订记录.
