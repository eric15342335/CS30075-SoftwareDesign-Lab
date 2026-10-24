import { Canvas } from '#domain/Canvas.ts';
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
  readonly #reader = new SvgReader();
  readonly #writer = new SvgWriter();
  #document: SvgDocument | null = null;
  /** The file that `save` writes to when it gets no file name: the last file read or saved. */
  #path: string | null = null;

  document(): SvgDocument {
    if (this.#document === null) throw new EditorError("no document. use 'init' or 'read' first");
    return this.#document;
  }

  /** Returns the ids for tab completion. Before init or read, there are none. */
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

  /** Writes to path, or else to the last file read or saved. Returns the file that it wrote. */
  save(path?: string): string {
    const document = this.document();
    const target = path ?? this.#path;
    if (target === null) throw new EditorError("no file name. use 'save <file.svg>'");
    this.#writer.write(target, document);
    this.#path = target;
    return target;
  }
}
