import { Command } from '#command/Command.ts';
import type { CommandExecutor } from '#command/CommandExecutor.ts';

/** init, read, save and canvas resize: afterwards undo and redo are refused until the next edit (spec 4.3). */
export abstract class DocumentCommand extends Command {
  override recordIn(executor: CommandExecutor): void {
    executor.recordDocumentChange();
  }
}
