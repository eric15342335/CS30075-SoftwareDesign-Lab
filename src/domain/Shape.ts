import { AttributeChange } from '#domain/AttributeChange.ts';
import { AttributeMemento } from '#domain/AttributeMemento.ts';
import type { Catalog } from '#domain/Catalog.ts';
import type { Decimal } from '#domain/Decimal.ts';
import { EditorError } from '#domain/EditorError.ts';
import type { Group } from '#domain/Group.ts';
import type { Memento } from '#domain/Memento.ts';

/** The positional parameters of `create <type> <id> ...`. The `help` command lists them too. */
export interface CreateSignature {
  readonly required: readonly string[];
  readonly optional?: string;
}

/** Shape is the component in the Composite pattern. Every edit works on leaves and groups alike. */
export abstract class Shape {
  static readonly #styleNames: readonly string[] = ['fill', 'stroke', 'stroke-width'];

  abstract readonly tag: string;
  readonly #id: string;
  #parent: Group | null = null;
  readonly #style = new Map<string, string>();
  /**
   * The attributes that the editor does not edit, such as transform, font-size and data-kind.
   * The shape keeps them, so a read followed by a save loses nothing.
   */
  readonly #extras = new Map<string, string>();

  constructor(id: string) {
    this.#id = id;
  }

  /** Group calls this method, so the parent links always match the child lists. */
  protected static link(child: Shape, parent: Group | null): void {
    child.#parent = parent;
  }

  get id(): string {
    return this.#id;
  }

  get parent(): Group | null {
    return this.#parent;
  }

  /** The type name. It equals the tag name, except for a shape type that a plugin adds on a tag. */
  get type(): string {
    return this.tag;
  }

  /** Returns the type and the id, such as `rect#r1` or `box#n1`. Feedback and `show` use it. */
  label(): string {
    return `${this.type}#${this.#id}`;
  }

  /** Returns the tag name and the id, such as `g#n1`. The rows of `tree` use it. */
  elementLabel(): string {
    return `${this.tag}#${this.#id}`;
  }

  abstract move(dx: Decimal, dy: Decimal): void;
  abstract scale(factor: Decimal): void;
  /** Saves the exact geometry of this shape and its descendants, for undoing move and scale. */
  abstract saveGeometry(): Memento;
  /** Describes the result of `move`: a leaf gives its new position, and a group gives the offset. */
  abstract movedPhrase(dx: Decimal, dy: Decimal): string;
  /** Returns the lines that `show` prints under the header. */
  abstract details(): string[];
  abstract createSignature(): CreateSignature;

  /**
   * Fills a new shape from the parameters of `create`. A composite shape overrides this method to
   * build its parts, and it can ask the catalog for them by type name.
   */
  configure(args: readonly string[], _catalog: Catalog): void {
    const { required, optional } = this.createSignature();
    const names = optional === undefined ? required : [...required, optional];
    if (args.length < required.length || args.length > names.length) {
      throw new EditorError(`usage: ${this.createUsage()}`);
    }
    for (const [index, name] of names.entries()) {
      const arg = args[index];
      if (arg !== undefined) this.setAttribute(name, arg);
    }
  }

  /**
   * Runs after `read` has filled this shape and its children. A composite shape overrides it and
   * throws an EditorError when a part is missing, which rejects the whole file.
   */
  loaded(): void {}

  /** Returns `create <type> <id> ...` with this shape's parameters, for `help` and argument errors. */
  createUsage(): string {
    const { required, optional } = this.createSignature();
    const params = required.map((name) => `<${name}>`);
    if (optional !== undefined) params.push(`[${optional}]`);
    return ['create', this.type, '<id>', ...params, '[in <containerId>]'].join(' ');
  }

  /** Returns the summary that `tree` prints after the label: the geometry, then the fill if set. */
  describe(): string {
    const fill = this.#style.get('fill');
    return [this.summary(), fill === undefined ? '' : `fill=${fill}`].filter(Boolean).join(' ');
  }

  children(): readonly Shape[] {
    return [];
  }

  asGroup(): Group | null {
    return null;
  }

  textContent(): string | undefined {
    return undefined;
  }

  /** Puts sibling right before this shape, in this shape's parent, like the DOM method `before()`. */
  before(sibling: Shape): void {
    const parent = this.#parent;
    if (parent === null) return;
    sibling.#parent?.remove(sibling);
    parent.insert(sibling, parent.indexOf(this));
  }

  /** Yields this shape, then its descendants in document order. */
  *walk(): Generator<Shape> {
    yield this;
    for (const child of this.children()) yield* child.walk();
  }

  /**
   * Changes an editable attribute for `set` and returns the change, which can restore the exact
   * old value. The value undefined removes the attribute. An invalid value throws before anything
   * changes.
   */
  setAttribute(name: string, value: string | undefined): AttributeChange {
    const change = this.assign(name, value);
    if (change === null) throw new EditorError(`unknown attribute: ${name}`);
    return change;
  }

  /**
   * Loads an attribute for `read`. An editable attribute goes through set, and the shape keeps
   * any other attribute as it is.
   */
  loadAttribute(name: string, value: string): void {
    if (this.assign(name, value) === null) this.#extras.set(name, value);
  }

  /** Loads the text children of the element for `read`. Only shapes with text content keep them. */
  loadText(_text: string): void {}

  /** Returns what `save` writes, in order: id, geometry, fill, stroke, stroke-width, kept extras. */
  attributes(): Array<[string, string]> {
    return [...this.ownAttributes(), ...this.#styleEntries(), ...this.#extras];
  }

  protected summary(): string {
    return '';
  }

  protected ownAttributes(): Array<[string, string]> {
    return [['id', this.#id]];
  }

  /**
   * Writes an attribute that this shape edits and returns the old value. The result null means
   * that this shape cannot edit an attribute with that name.
   */
  protected assign(name: string, value: string | undefined): AttributeChange | null {
    if (!Shape.#styleNames.includes(name)) return null;
    const old = this.#style.get(name);
    if (value === undefined) this.#style.delete(name);
    else this.#style.set(name, value);
    return new AttributeChange(old, new AttributeMemento(this, name, old));
  }

  /** Returns the style and kept extras as name=value words, which form the last line of `show`. */
  protected styleText(): string {
    return [...this.#styleEntries(), ...this.#extras]
      .map(([name, value]) => `${name}=${value}`)
      .join(' ');
  }

  *#styleEntries(): Generator<[string, string]> {
    for (const name of Shape.#styleNames) {
      const value = this.#style.get(name);
      if (value !== undefined) yield [name, value];
    }
  }
}
