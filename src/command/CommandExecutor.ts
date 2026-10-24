import type { Command } from '#command/Command.ts';
import type { EditCommand } from '#command/EditCommand.ts';
import { EditorError } from '#domain/EditorError.ts';

/**
 * CommandExecutor is the invoker in the Command pattern. It runs commands and keeps the undo and
 * redo stacks. Each command records itself through recordIn().
 */
export class CommandExecutor {
  readonly #undo: EditCommand[] = [];
  readonly #redo: EditCommand[] = [];
  #ioBarrier = false;

  /** Runs a command and returns its feedback. A command that throws is not recorded. */
  execute(command: Command): string[] {
    const feedback = command.execute();
    command.recordIn(this);
    return feedback;
  }

  undo(): string[] {
    const command = this.#undo.at(-1);
    if (command === undefined) throw this.#emptyHistory('nothing to undo');
    const feedback = command.undo();
    this.#undo.pop();
    this.#redo.push(command);
    return feedback;
  }

  redo(): string[] {
    const command = this.#redo.at(-1);
    if (command === undefined) throw this.#emptyHistory('nothing to redo');
    const feedback = command.execute();
    this.#redo.pop();
    this.#undo.push(command);
    return feedback;
  }

  /** Records a new edit. A new edit clears the redo stack and removes the io barrier. */
  recordEdit(command: EditCommand): void {
    this.#undo.push(command);
    this.#redo.length = 0;
    this.#ioBarrier = false;
  }

  recordDocumentChange(): void {
    this.#undo.length = 0;
    this.#redo.length = 0;
    this.#ioBarrier = true;
  }

  #emptyHistory(message: string): EditorError {
    return new EditorError(this.#ioBarrier ? 'undo not allowed after io command' : message);
  }
}
