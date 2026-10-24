import { Command } from '#command/Command.ts';
import type { CommandExecutor } from '#command/CommandExecutor.ts';

/** An edit command is a change to the document that the user can undo. Redo runs execute() again. */
export abstract class EditCommand extends Command {
  /** Puts the document back as it was before execute() and returns the feedback lines. */
  abstract undo(): string[];

  override recordIn(executor: CommandExecutor): void {
    executor.recordEdit(this);
  }
}
