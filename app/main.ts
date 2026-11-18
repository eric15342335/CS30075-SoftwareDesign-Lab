import { BuiltinShapes } from '#builtin/BuiltinShapes.ts';
import { CliProgram } from '#cli/CliProgram.ts';
import { Repl } from '#cli/Repl.ts';
import { CommandExecutor } from '#command/CommandExecutor.ts';
import { Workspace } from '#command/Workspace.ts';
import { Catalog } from '#domain/Catalog.ts';

// This file is the composition root. It is the one place that picks the concrete classes and
// wires them together.
const catalog = new Catalog();
new BuiltinShapes().register(catalog);
const program = new CliProgram(new Workspace(catalog), new CommandExecutor(), catalog);
await new Repl(program, process.stdin, process.stdout).start();
