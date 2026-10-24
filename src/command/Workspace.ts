import { Canvas } from '#domain/Canvas.ts';
import { Decimal } from '#domain/Decimal.ts';
import { EditorError } from '#domain/EditorError.ts';
import { SvgDocument } from '#domain/SvgDocument.ts';

/** Receiver of the document commands: holds the current document. */
export class Workspace {
  #document: SvgDocument | null = null;

  document(): SvgDocument {
    if (this.#document === null) throw new EditorError("no document. use 'init' or 'read' first");
    return this.#document;
  }

  /** Ids for tab completion; none before init or read. */
  ids(): string[] {
    return this.#document?.ids() ?? [];
  }

  init(width = new Decimal(800), height = new Decimal(600)): SvgDocument {
    this.#document = new SvgDocument(new Canvas(width, height));
    return this.#document;
  }
}
