import { writeFileSync } from 'node:fs';

import { XMLBuilder } from 'fast-xml-parser';

import { EditorError } from '#domain/EditorError.ts';
import type { Shape } from '#domain/Shape.ts';
import type { SvgDocument } from '#domain/SvgDocument.ts';

/** Writes a document as indented SVG text, in the format of the spec's section 0.1 sample. */
export class SvgWriter {
  static readonly #builder = new XMLBuilder({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: '',
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
  });
  static readonly #declaration = {
    '?xml': [{ '#text': '' }],
    ':@': { version: '1.0', encoding: 'UTF-8' },
  };

  /** Throws EditorError when the file cannot be written. */
  write(path: string, document: SvgDocument): void {
    const text = this.serialize(document);
    try {
      writeFileSync(path, text);
    } catch {
      throw new EditorError(`cannot write file: ${path}`);
    }
  }

  serialize(document: SvgDocument): string {
    const tree = [SvgWriter.#declaration, this.#node(document.canvas)];
    return `${SvgWriter.#builder.build(tree)}\n`;
  }

  /** A shape in fast-xml-parser's preserveOrder form: its text or its children, plus its attributes. */
  #node(shape: Shape): Record<string, unknown> {
    const text = shape.textContent();
    const content = text ? [{ '#text': text }] : shape.children().map((child) => this.#node(child));
    return { [shape.tag]: content, ':@': Object.fromEntries(shape.attributes()) };
  }
}
