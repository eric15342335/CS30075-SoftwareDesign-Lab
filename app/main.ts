import { BuiltinCommands } from '#builtin/BuiltinCommands.ts';
import { BuiltinShapes } from '#builtin/BuiltinShapes.ts';
import { CliProgram } from '#cli/CliProgram.ts';
import { Repl } from '#cli/Repl.ts';
import { CommandExecutor } from '#command/CommandExecutor.ts';
import { Extensions } from '#command/Extensions.ts';
import { Workspace } from '#command/Workspace.ts';

// This file is the composition root. It is the one place that picks the concrete classes and
// wires them together.
const extensions = new Extensions();
new BuiltinShapes().register(extensions.catalog);
new BuiltinCommands().register(extensions.commands);
const program = new CliProgram(
  new Workspace(extensions.catalog, extensions.observers()),
  new CommandExecutor(),
  extensions,
);
await new Repl(program, process.stdin, process.stdout).start();
