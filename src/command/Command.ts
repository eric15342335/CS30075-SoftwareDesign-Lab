import type { CommandExecutor } from '#command/CommandExecutor.ts';

/** One user request as an object. Commands never print: execute() returns the feedback lines. */
export abstract class Command {
  /** Throws EditorError when the request is invalid, and the document is then unchanged. */
  abstract execute(): string[];

  /** Display commands leave the history alone; EditCommand and DocumentCommand override this. */
  recordIn(_executor: CommandExecutor): void {}
}
