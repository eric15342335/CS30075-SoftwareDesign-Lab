import { CliProgram } from '#cli/CliProgram.ts';
import { Repl } from '#cli/Repl.ts';
import { CommandExecutor } from '#command/CommandExecutor.ts';
import { Workspace } from '#command/Workspace.ts';

// This file is the composition root. It is the one place that picks the concrete classes and
// wires them together.
const program = new CliProgram(new Workspace(), new CommandExecutor());
await new Repl(program, process.stdin, process.stdout).start();
