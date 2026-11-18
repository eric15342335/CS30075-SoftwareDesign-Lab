import type { Plugin } from '#api/Plugin.ts';
import { CliProgram } from '#cli/CliProgram.ts';
import { CommandExecutor } from '#command/CommandExecutor.ts';
import { Workspace } from '#command/Workspace.ts';
import { StagedContext } from '#host/StagedContext.ts';
import { Session } from '#test/support/Session.ts';

/**
 * PluginHarness runs plugins in a CLI with the built-in extensions, without a package or a config
 * file. Each plugin activates into a staged context and is committed the same way as in the host.
 */
export class PluginHarness {
  readonly extensions = Session.extensions();
  readonly workspace: Workspace;
  readonly program: CliProgram;

  constructor(plugins: Plugin[], options: Readonly<Record<string, unknown>> = {}) {
    for (const plugin of plugins) {
      const context = new StagedContext(this.extensions, options);
      plugin.activate(context);
      context.check();
      context.commit();
    }
    this.workspace = new Workspace(this.extensions.catalog, this.extensions.observers.values());
    this.program = new CliProgram(this.workspace, new CommandExecutor(), this.extensions);
  }

  /** Runs one input line, like the REPL does, and returns the feedback lines. */
  run(line: string): string[] {
    return this.program.run(line);
  }
}
