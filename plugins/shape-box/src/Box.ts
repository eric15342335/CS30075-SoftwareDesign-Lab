import { Decimal, EditorError, Group } from '@svgframe/api';
import type { Catalog } from '@svgframe/api';

/**
 * Box is a titled rectangle: a container on the tag g that owns two parts, the rect <id>-rect
 * and the text <id>-label. It is saved with data-kind="box". The kernel keeps the parts in
 * place, because Box says that it holds them and cannot be dissolved.
 */
export class Box extends Group {
  readonly #fill: string;

  constructor(id: string, fill: string) {
    super(id);
    this.#fill = fill;
  }

  override get type(): string {
    return 'box';
  }

  override createSignature() {
    return { required: ['x', 'y', 'width', 'height', 'label'] };
  }

  /** Builds the parts. The label sits at (x + w/8, y + h/2 + 5), like spec section 6.1 B. */
  override configure(args: readonly string[], catalog: Catalog): void {
    const [x = '', y = '', width = '', height = '', label = ''] = args;
    if (args.length !== 5) throw new EditorError(`usage: ${this.createUsage()}`);
    const rect = catalog.createShape('rect', this.#part('rect'));
    rect.configure([x, y, width, height, this.#fill], catalog);
    const left = Decimal.parse(x).plus(Decimal.parse(width).times(new Decimal(0.125)));
    const base = Decimal.parse(y)
      .plus(Decimal.parse(height).times(new Decimal(0.5)))
      .plus(new Decimal(5));
    const text = catalog.createShape('text', this.#part('label'));
    text.configure([left.toString(), base.toString(), label], catalog);
    this.insert(rect);
    this.insert(text);
  }

  /** A box that was read must have exactly its two parts, in order. Otherwise the read fails. */
  override loaded(): void {
    const parts = this.children().map((child) => child.elementLabel());
    const expected = [`rect#${this.#part('rect')}`, `text#${this.#part('label')}`];
    if (parts.join(' ') !== expected.join(' ')) {
      throw new EditorError(`box ${this.id} needs exactly the parts ${expected.join(' and ')}`);
    }
  }

  /** data-kind only tells the reader to make a box, so the box does not keep it as an extra. */
  override loadAttribute(name: string, value: string): void {
    if (name !== 'data-kind') super.loadAttribute(name, value);
  }

  override holds(child: { id: string }): boolean {
    return child.id === this.#part('rect') || child.id === this.#part('label');
  }

  override dissolvable(): boolean {
    return false;
  }

  protected override ownAttributes(): Array<[string, string]> {
    return [...super.ownAttributes(), ['data-kind', 'box']];
  }

  #part(name: 'rect' | 'label'): string {
    return `${this.id}-${name}`;
  }
}
