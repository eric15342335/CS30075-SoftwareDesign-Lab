import { Canvas } from '#domain/Canvas.ts';
import { Decimal } from '#domain/Decimal.ts';
import { EditorError } from '#domain/EditorError.ts';
import { SvgDocument } from '#domain/SvgDocument.ts';
import { SvgReader } from '#io/SvgReader.ts';
import { SvgWriter } from '#io/SvgWriter.ts';

/** Receiver of the document commands: holds the current document and the file it belongs to. */
export class Workspace {
  readonly #reader = new SvgReader();
  readonly #writer = new SvgWriter();
  #document: SvgDocument | null = null;
  /** Where `save` without a file name writes: the file last read or saved. */
  #path: string | null = null;

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
    this.#path = null;
    return this.#document;
  }

  /** Opens the file as the document and returns the reader's warnings. A failed read changes nothing. */
  read(path: string): string[] {
    this.#document = this.#reader.read(path);
    this.#path = path;
    return this.#reader.warnings();
  }

  /** Writes to path, or else to the file last read or saved, and returns the file written. */
  save(path?: string): string {
    const document = this.document();
    const target = path ?? this.#path;
    if (target === null) throw new EditorError("no file name. use 'save <file.svg>'");
    this.#writer.write(target, document);
    this.#path = target;
    return target;
  }
}
