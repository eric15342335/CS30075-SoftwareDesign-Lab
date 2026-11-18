import type { WorkspaceObserver } from '#command/WorkspaceObserver.ts';
import type { SvgDocument } from '#domain/SvgDocument.ts';

/** A test workspace observer. It records each event, or throws when the test asks it to. */
export class RecordingObserver implements WorkspaceObserver {
  readonly name: string;
  readonly events: string[] = [];
  readonly #fail: boolean;

  constructor(name: string, fail = false) {
    this.name = name;
    this.#fail = fail;
  }

  opened(document: SvgDocument): void {
    this.#record(`opened ${document.count()}`);
  }

  saved(document: SvgDocument): void {
    this.#record(`saved ${document.count()}`);
  }

  #record(event: string): void {
    if (this.#fail) throw new Error('broken on purpose');
    this.events.push(event);
  }
}
