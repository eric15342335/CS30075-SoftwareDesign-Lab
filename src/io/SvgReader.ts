import { readFileSync } from 'node:fs';

import { XMLParser } from 'fast-xml-parser';
import { SyntaxValidator } from 'fast-xml-validator';

import { Canvas } from '#domain/Canvas.ts';
import { Decimal } from '#domain/Decimal.ts';
import { EditorError } from '#domain/EditorError.ts';
import type { Shape } from '#domain/Shape.ts';
import { ShapeFactory } from '#domain/ShapeFactory.ts';
import { SvgDocument } from '#domain/SvgDocument.ts';

/**
 * A node in the preserveOrder form of fast-xml-parser. One key names the tag (or #text), and the
 * key ':@' holds the attributes.
 */
type XmlNode = Readonly<Record<string, unknown>>;

/**
 * SvgReader turns SVG text into a document. It skips the elements that it cannot use and replaces
 * the ids that it cannot keep. After each read, warnings() tells what happened.
 */
export class SvgReader {
  static readonly #parser = new XMLParser({
    preserveOrder: true,
    ignoreAttributes: false,
    attributeNamePrefix: '',
    // This option keeps "007" as text instead of turning it into the number 7.
    parseTagValue: false,
    ignoreDeclaration: true,
    ignorePiTags: true,
  });
  /** The root attributes that the canvas writes by itself. */
  static readonly #canvasOwned = new Set(['xmlns', 'width', 'height', 'viewBox']);
  readonly #factory = new ShapeFactory();
  /** Every id in the file. With this set, an assigned id never takes an id that appears later. */
  #written = new Set<string>();
  /** The ids that the reader has given to shapes so far. */
  readonly #given = new Set<string>();
  readonly #warnings: string[] = [];

  /** Reads the file at path. Throws an EditorError when the file is missing or is not usable SVG. */
  read(path: string): SvgDocument {
    const text = this.#load(path);
    try {
      return this.parse(text);
    } catch (error) {
      if (!(error instanceof EditorError)) throw error;
      throw new EditorError(`cannot read file: ${path} (${error.message})`);
    }
  }

  parse(text: string): SvgDocument {
    this.#given.clear();
    this.#warnings.length = 0;
    this.#validate(text);
    const parsed: unknown = SvgReader.#parser.parse(text);
    const nodes: readonly XmlNode[] = Array.isArray(parsed) ? parsed : [];
    const root = nodes.find((node) => this.#tag(node) === 'svg');
    if (root === undefined) throw new EditorError('no <svg> root element');
    const attributes = this.#attributes(root);
    const canvas = this.#canvas(attributes);
    for (const [name, value] of attributes) {
      if (!SvgReader.#canvasOwned.has(name)) canvas.loadAttribute(name, value);
    }
    this.#written = new Set(this.#ids(nodes));
    this.#fill(canvas, this.#children(root));
    return new SvgDocument(canvas);
  }

  /**
   * Throws an EditorError with the line number when the text is not well-formed XML. A byte order
   * mark at the start is allowed.
   */
  #validate(text: string): void {
    try {
      SyntaxValidator.validate(text);
    } catch (error) {
      // The validator throws an Error with a numeric line property. Its type file still describes
      // the return value of an older version.
      if (!(error instanceof Error && 'line' in error && typeof error.line === 'number'))
        throw error;
      throw new EditorError(`line ${error.line}: ${error.message.replace(/\.$/, '')}`);
    }
  }

  /** Returns what the last read skipped or renamed, one line for each item. */
  warnings(): string[] {
    return [...this.#warnings];
  }

  #load(path: string): string {
    try {
      return readFileSync(path, 'utf8');
    } catch {
      throw new EditorError(`cannot read file: ${path}`);
    }
  }

  /**
   * Creates the canvas. Its size comes from width and height, or from the size part of viewBox
   * when they are missing.
   */
  #canvas(attributes: ReadonlyMap<string, string>): Canvas {
    const [, , boxWidth, boxHeight] = (attributes.get('viewBox') ?? '').trim().split(/[\s,]+/);
    const width = attributes.get('width') ?? boxWidth;
    const height = attributes.get('height') ?? boxHeight;
    if (width === undefined || height === undefined) {
      throw new EditorError('<svg> has no width and height');
    }
    return new Canvas(Decimal.parse(width), Decimal.parse(height));
  }

  /** Adds the usable elements in nodes to parent, in document order. */
  #fill(parent: Shape, nodes: readonly XmlNode[]): void {
    const group = parent.asGroup();
    for (const node of nodes) {
      const tag = this.#tag(node);
      if (tag === '#text') continue;
      if (group === null) {
        this.#warnings.push(`skipped <${tag}>: ${parent.label()} cannot contain elements`);
        continue;
      }
      const shape = this.#shape(tag, node);
      if (shape === null) continue;
      group.insert(shape);
      this.#fill(shape, this.#children(node));
    }
  }

  /** Turns one element into a shape, or returns null with a warning when the element is unusable. */
  #shape(tag: string, node: XmlNode): Shape | null {
    const attributes = this.#attributes(node);
    if (!this.#factory.supports(tag)) {
      this.#warnings.push(
        `skipped ${this.#describe(tag, attributes.get('id'))}: unsupported element`,
      );
      return null;
    }
    const shape = this.#factory.create(tag, this.#id(tag, attributes.get('id')));
    try {
      for (const [name, value] of attributes) {
        if (name !== 'id') shape.loadAttribute(name, value);
      }
    } catch (error) {
      if (!(error instanceof EditorError)) throw error;
      this.#warnings.push(`skipped ${this.#describe(tag, shape.id)}: ${error.message}`);
      return null;
    }
    shape.loadText(this.#text(node));
    return shape;
  }

  /**
   * Returns the id from the file, unless an earlier element already has it. In that case, it
   * returns the tag name plus the first free number.
   */
  #id(tag: string, written: string | undefined): string {
    if (written && !this.#given.has(written)) {
      this.#given.add(written);
      return written;
    }
    let number = 1;
    while (this.#written.has(`${tag}${number}`) || this.#given.has(`${tag}${number}`)) number += 1;
    const id = `${tag}${number}`;
    this.#given.add(id);
    this.#warnings.push(
      written
        ? `assigned id ${id} to <${tag}> with duplicate id ${written}`
        : `assigned id ${id} to unnamed <${tag}>`,
    );
    return id;
  }

  #describe(tag: string, id: string | undefined): string {
    return id ? `<${tag} id="${id}">` : `<${tag}>`;
  }

  /** Yields every id attribute in the tree, including those of skipped elements. */
  *#ids(nodes: readonly XmlNode[]): Generator<string> {
    for (const node of nodes) {
      const id = this.#attributes(node).get('id');
      if (id) yield id;
      yield* this.#ids(this.#children(node));
    }
  }

  /** Returns the tag name, or #text for character data. */
  #tag(node: XmlNode): string {
    return Object.keys(node).find((key) => key !== ':@') ?? '#text';
  }

  #children(node: XmlNode): readonly XmlNode[] {
    const children = node[this.#tag(node)];
    return Array.isArray(children) ? children : [];
  }

  #attributes(node: XmlNode): Map<string, string> {
    const attributes: unknown = node[':@'];
    if (typeof attributes !== 'object' || attributes === null) return new Map();
    return new Map(
      Object.entries(attributes).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    );
  }

  /** Returns the character data directly inside the element, which is the content of a <text>. */
  #text(node: XmlNode): string {
    return this.#children(node)
      .map((child) => child['#text'])
      .filter((value) => typeof value === 'string')
      .join('');
  }
}
