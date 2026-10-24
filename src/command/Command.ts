import type { CommandExecutor } from '#command/CommandExecutor.ts';

/**
 * A command is one user request, stored as an object. Commands never print. Their execute()
 * method returns the feedback lines.
 */
export abstract class Command {
  /** Throws an EditorError when the request is invalid. In that case, the document stays unchanged. */
  abstract execute(): string[];

  /** Display commands do not change the history. EditCommand and DocumentCommand override this. */
  recordIn(_executor: CommandExecutor): void {}
}
