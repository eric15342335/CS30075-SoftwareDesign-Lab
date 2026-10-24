import type { Decimal } from '#domain/Decimal.ts';
import { EditorError } from '#domain/EditorError.ts';
import type { Group } from '#domain/Group.ts';
import type { Memento } from '#domain/Memento.ts';

/** Positional parameters of `create <type> <id> ...`; `help` lists them too. */
export interface CreateSignature {
  readonly required: readonly string[];
  readonly optional?: string;
}

/** Composite component: every edit works on leaves and groups alike. */
export abstract class Shape {
  static readonly #styleNames: readonly string[] = ['fill', 'stroke', 'stroke-width'];

  abstract readonly tag: string;
  readonly #id: string;
  #parent: Group | null = null;
  readonly #style = new Map<string, string>();
  /** Attributes the editor does not edit (transform, font-size, data-kind...), kept so read then save loses nothing. */
  readonly #extras = new Map<string, string>();

  constructor(id: string) {
    this.#id = id;
  }

  /** Group calls this so parent links always match child lists. */
  protected static link(child: Shape, parent: Group | null): void {
    child.#parent = parent;
  }

  get id(): string {
    return this.#id;
  }

  get parent(): Group | null {
    return this.#parent;
  }

  label(): string {
    return `${this.tag}#${this.#id}`;
  }

  abstract move(dx: Decimal, dy: Decimal): void;
  abstract scale(factor: Decimal): void;
  /** Saves the exact geometry of this shape and its descendants, for undoing move and scale. */
  abstract saveGeometry(): Memento;
  /** How `move` reports the result: leaves give their new position, groups the offset. */
  abstract movedPhrase(dx: Decimal, dy: Decimal): string;
  /** The lines `show` prints under the header. */
  abstract details(): string[];
  abstract createSignature(): CreateSignature;

  /** `create <type> <id> ...` with this shape's parameters, for `help` and argument errors. */
  createUsage(): string {
    const { required, optional } = this.createSignature();
    const params = required.map((name) => `<${name}>`);
    if (optional !== undefined) params.push(`[${optional}]`);
    return ['create', this.tag, '<id>', ...params, '[in <containerId>]'].join(' ');
  }

  /** The summary `tree` prints after the label: geometry, then fill when set. */
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

  /** Puts sibling right before this shape in this shape's parent, like DOM `before()`. */
  before(sibling: Shape): void {
    const parent = this.#parent;
    if (parent === null) return;
    sibling.#parent?.remove(sibling);
    parent.insert(sibling, parent.indexOf(this));
  }

  /** This shape, then its descendants in document order. */
  *walk(): Generator<Shape> {
    yield this;
    for (const child of this.children()) yield* child.walk();
  }

  /** `set`: changes an editable attribute (undefined removes it) and returns the old value. */
  setAttribute(name: string, value: string | undefined): string | undefined {
    const change = this.assign(name, value);
    if (change === null) throw new EditorError(`unknown attribute: ${name}`);
    return change.old;
  }

  /** `read`: editable names go through set, anything else is kept as it is. */
  loadAttribute(name: string, value: string): void {
    if (this.assign(name, value) === null) this.#extras.set(name, value);
  }

  /** What `save` writes, in order: id, geometry, fill, stroke, stroke-width, kept extras. */
  attributes(): Array<[string, string]> {
    return [...this.ownAttributes(), ...this.#styleEntries(), ...this.#extras];
  }

  protected summary(): string {
    return '';
  }

  protected ownAttributes(): Array<[string, string]> {
    return [['id', this.#id]];
  }

  /** Writes an attribute this shape edits and returns the old value; null means the name is not editable here. */
  protected assign(name: string, value: string | undefined): { old: string | undefined } | null {
    if (!Shape.#styleNames.includes(name)) return null;
    const old = this.#style.get(name);
    if (value === undefined) this.#style.delete(name);
    else this.#style.set(name, value);
    return { old };
  }

  /** Style and kept extras as name=value words: the last line of `show`. */
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
