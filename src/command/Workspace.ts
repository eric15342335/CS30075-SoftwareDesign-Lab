import type { WorkspaceObserver } from '#command/WorkspaceObserver.ts';
import { Canvas } from '#domain/Canvas.ts';
import type { Catalog } from '#domain/Catalog.ts';
import { Decimal } from '#domain/Decimal.ts';
import { EditorError } from '#domain/EditorError.ts';
import { SvgDocument } from '#domain/SvgDocument.ts';
import { SvgReader } from '#io/SvgReader.ts';
import { SvgWriter } from '#io/SvgWriter.ts';

/**
 * Workspace is the receiver of the document commands. It holds the current document and the file
 * that the document belongs to.
 */
// 待重构: The command module uses io directly. The spec allows IO without isolation in this phase.
// When a second storage format or a test double becomes necessary, define a store interface here
// and implement it in io.
export class Workspace {
  readonly #catalog: Catalog;
  readonly #reader: SvgReader;
  readonly #writer = new SvgWriter();
  readonly #observers: readonly WorkspaceObserver[];
  /** The error lines of the observers that failed during the last init, read or save. */
  #failures: string[] = [];
  #document: SvgDocument | null = null;
  /** The file that `save` writes to when it gets no file name: the last file read or saved. */
  #path: string | null = null;

  constructor(catalog: Catalog, observers: readonly WorkspaceObserver[] = []) {
    this.#catalog = catalog;
    this.#observers = observers;
    this.#reader = new SvgReader(catalog);
  }

  document(): SvgDocument {
    if (this.#document === null) throw new EditorError("no document. use 'init' or 'read' first");
    return this.#document;
  }

  /** Returns the ids for tab completion. Before init or read, there are none. */
  ids(): string[] {
    return this.#document?.ids() ?? [];
  }

  init(width = new Decimal(800), height = new Decimal(600)): SvgDocument {
    const document = new SvgDocument(new Canvas(width, height), this.#catalog);
    this.#document = document;
    this.#path = null;
    this.#notify((observer) => observer.opened(document));
    return document;
  }

  /** Opens the file as the document and returns the reader's warnings. A failed read changes nothing. */
  read(path: string): string[] {
    const document = this.#reader.read(path);
    this.#document = document;
    this.#path = path;
    this.#notify((observer) => observer.opened(document));
    return this.#reader.warnings();
  }

  /** Writes to path, or else to the last file read or saved. Returns the file that it wrote. */
  save(path?: string): string {
    const document = this.document();
    const target = path ?? this.#path;
    if (target === null) throw new EditorError("no file name. use 'save <file.svg>'");
    this.#writer.write(target, document);
    this.#path = target;
    this.#notify((observer) => observer.saved(document));
    return target;
  }

  /**
   * Returns and forgets the error lines of the observers that failed in the last init, read or
   * save. The command itself still succeeded, so the lines are part of its feedback.
   */
  observerErrors(): string[] {
    const failures = this.#failures;
    this.#failures = [];
    return failures;
  }

  /** Calls every observer after the state has changed. One failing observer does not stop the rest. */
  #notify(event: (observer: WorkspaceObserver) => void): void {
    this.#failures = [];
    for (const observer of this.#observers) {
      try {
        event(observer);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        this.#failures.push(`error: workspace observer failed: ${observer.name} (${reason})`);
      }
    }
  }
}
