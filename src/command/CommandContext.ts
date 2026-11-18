import type { CommandExecutor } from '#command/CommandExecutor.ts';
import type { TreeDecorator } from '#command/TreeDecorator.ts';
import type { Workspace } from '#command/Workspace.ts';

/** The receivers that a command provider may hand to the commands that it creates. */
export interface CommandContext {
  readonly workspace: Workspace;
  readonly executor: CommandExecutor;
  /** Returns the registered tree decorators, in the order of registration. */
  decorators(): TreeDecorator[];
  /** Returns the text of `help`, which only the CLI can build. */
  help(): string[];
}
