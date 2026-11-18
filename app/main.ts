import { BuiltinCommands } from '#builtin/BuiltinCommands.ts';
import { BuiltinShapes } from '#builtin/BuiltinShapes.ts';
import { CliProgram } from '#cli/CliProgram.ts';
import { Repl } from '#cli/Repl.ts';
import { CommandExecutor } from '#command/CommandExecutor.ts';
import { Extensions } from '#command/Extensions.ts';
import { Workspace } from '#command/Workspace.ts';
import { PluginHost } from '#host/PluginHost.ts';
import type { PluginSource } from '#host/PluginSource.ts';

// This file is the composition root. It is the one place that picks the concrete classes and
// wires them together.
const extensions = new Extensions();
new BuiltinShapes().register(extensions.catalog);
new BuiltinCommands().register(extensions.commands);

// Mode A, code assembly: the plugins that this build ships. Each entry imports its package only
// when the host installs it, so a broken plugin cannot stop the editor from starting.
const shipped: PluginSource[] = [];
const plugins = process.argv.includes('--no-plugins') ? [] : shipped;
const problems = await new PluginHost(extensions).installAll(plugins);

const program = new CliProgram(
  new Workspace(extensions.catalog, extensions.observers.values()),
  new CommandExecutor(),
  extensions,
);
await new Repl(program, process.stdin, process.stdout).start(problems);
