import { Command } from '#command/Command.ts';
import type { CommandExecutor } from '#command/CommandExecutor.ts';

/** An undoable change to the document. Redo runs execute() again. */
export abstract class EditCommand extends Command {
  /** Puts the document back as it was before execute() and returns the feedback lines. */
  abstract undo(): string[];

  override recordIn(executor: CommandExecutor): void {
    executor.recordEdit(this);
  }
}
