# Agent guide

This repository holds an SVG editor CLI for CS30075 Lab1, Phases 1 and 2. The Phase 1 spec is `doc/pj1-phase1/phase_cli_1.md`. The Phase 2 spec is `doc/pj1-phase2/phase_cli_2.md`. The Phase 2 design, the process log, the self-check and the QA results are in `doc/README.md`, which is written in Chinese. The Phase 1 design document is `doc/pj1-phase1/README.md`.

## Commands

- `bun install` installs the dependencies. Run it again after you add a package in `plugins/` or `test/fixtures/plugins/`, so that its workspace link exists.
- `bun run cli` starts the REPL with the plugins that `app/main.ts` lists (mode A). `bun run cli --config plugins.config.json` loads the plugins of a config file instead (mode B). `bun run cli --no-plugins` loads only the built-in extensions.
- `bun test` runs the tests.
- `bun run check` runs everything that CI runs: the format check, lint with the architecture rules, the type check, knip, and the tests with coverage thresholds.
- `bun run fmt` formats the code, and `bunx oxlint --fix` applies lint fixes.
- `bun scripts/metrics.ts [--from final] [--to HEAD]` writes `docs/metrics/` from committed trees. Never edit those files by hand.
- `bun run mutation` runs Stryker. `scripts/stryker-sandbox.ts` prepares its sandbox, because Stryker leaves `tsconfig.json` out.
- `bun scripts/baseline.ts` records the output of the tag `final` for `doc/transcript/cli-1.txt` and `cli-2.txt` into `doc/transcript/expected/`.

## Rules the code must follow (they are graded)

- Use OOP: a class hierarchy with polymorphism, encapsulated `#private` fields, and one class per file, where the file name equals the class name. Do not write anemic data classes or free functions, and do not dispatch on the shape type with `switch` or `instanceof`.
- The kernel (`src/`) has no list of concrete shapes, commands or plugins. Shape types, commands, tree decorators, attribute handlers and workspace observers are registered in `Registry` objects (`Catalog` and `Extensions`) and looked up by name. `src/builtin/` registers the Phase 1 shapes and commands.
- A plugin is a workspace package in `plugins/`. Its default export is a `Plugin` class, and its `package.json` lists every registration under `contributes` (`shapes`, `commands`, `decorators`, `attributes`, `observers`). Plugin tests sit next to their sources in `plugins/*/src`. Adding a plugin must not change `src/`. Mode A lists it in `app/main.ts` and in `test/fixtures/assembly.config.json`; mode B lists it in `plugins.config.json`.
- Containers and leaves support the same operations (Composite pattern).
- Follow the Command pattern. A concrete command only forwards the request to its receiver (`SvgDocument`, `Workspace`, `TreeRenderer` or a plugin's receiver). Validation and the spec's error messages live in the receiver. Undo stores the minimum prior state (`GeometryMemento`, `Placement`, `AttributeEdit`, or the old values). Never take a snapshot of the whole document.
- Commands are synchronous and never print. They return feedback lines, and only `src/cli/Repl.ts` and `app/main.ts` touch stdin and stdout.
- Do not use deprecated APIs. Oxlint's `typescript/no-deprecated` rule fails the check when code uses one. Use the replacement that the deprecation notice names.

## Module boundaries (oxlint `no-restricted-imports` enforces them)

| Module          | May import                                                               |
| --------------- | ------------------------------------------------------------------------ |
| `src/domain`    | nothing: no `node:*`, no Bun, no packages                                |
| `src/io`        | domain, `node:fs`, fast-xml-parser, fast-xml-validator, fast-xml-builder |
| `src/command`   | domain, io                                                               |
| `src/cli`       | command, domain, commander, `node:*` except `node:fs`                    |
| `src/builtin`   | domain, command; no libraries                                            |
| `src/api`       | domain, command; plugins see it as `@svgframe/api`                       |
| `app/` (host)   | every kernel module, `node:*`                                            |
| `plugins/*/src` | `@svgframe/api`, `node:*` and its own files; no other package            |
| plugin tests    | `@svgframe/api` and `@svgframe/testing`                                  |

Each module has one allow-list in `.oxlintrc.json`, so anything the table does not list is an error. No module in `src/` may import `#host/...`, `#test/...`, `#scripts/...` or any `@svgframe/...` package. Cross-module imports use the `#domain/...`, `#command/...`, `#io/...`, `#cli/...`, `#builtin/...`, `#api/...`, `#host/...`, `#scripts/...` and `#test/...` aliases. Imports that start with `../` are banned. `test/lint/ModuleRules.test.ts` checks every allowed and forbidden import of each rule with a probe file.

## Workflow

- Write the tests first (`bun:test`). Every error message in the spec and every transcript in the spec has a test.
- Tests take repository paths from `repo` in `test/support/Paths.ts` and temp folders from `using folder = new TempFolder()`, which deletes the folder when the test ends. `CliProcess` starts the real CLI, and `TranscriptRunner` runs a transcript in one fixed folder. Plugin tests get `TempFolder` from `@svgframe/testing`.
- Make one commit per step, with a conventional commit message (commitlint checks it).
- When an AI suggestion turns out to be wrong or the spec is unclear, add an entry to 过程记录 or 附录 A in `doc/README.md`. Record plan changes in 1.5 与初版方案的差异.
