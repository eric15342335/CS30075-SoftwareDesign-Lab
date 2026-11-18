import type { CommandExecutor } from '#command/CommandExecutor.ts';
import type { Workspace } from '#command/Workspace.ts';

/** The receivers that a command provider may hand to the commands that it creates. */
export interface CommandContext {
  readonly workspace: Workspace;
  readonly executor: CommandExecutor;
  /** Returns the text of `help`, which only the CLI can build. */
  help(): string[];
}
