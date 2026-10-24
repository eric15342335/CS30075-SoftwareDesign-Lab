import type { Decimal } from '#domain/Decimal.ts';
import { type CreateSignature, Shape } from '#domain/Shape.ts';

/** Composite container: an operation on a group reaches every descendant. */
export class Group extends Shape {
  override readonly tag: string = 'g';
  readonly #children: Shape[] = [];

  override children(): readonly Shape[] {
    return [...this.#children];
  }

  override asGroup(): Group {
    return this;
  }

  /** Adds a child at index (default: last), first taking it out of its current parent. */
  insert(child: Shape, index?: number): void {
    child.parent?.remove(child);
    this.#children.splice(index ?? this.#children.length, 0, child);
    Shape.link(child, this);
  }

  /** Takes a child out and returns the index it had. */
  remove(child: Shape): number {
    const index = this.#children.indexOf(child);
    if (index < 0) throw new Error(`${child.label()} is not a child of ${this.label()}`);
    this.#children.splice(index, 1);
    Shape.link(child, null);
    return index;
  }

  indexOf(child: Shape): number {
    return this.#children.indexOf(child);
  }

  override move(dx: Decimal, dy: Decimal): void {
    for (const child of this.#children) child.move(dx, dy);
  }

  override scale(factor: Decimal): void {
    for (const child of this.#children) child.scale(factor);
  }

  override movedPhrase(dx: Decimal, dy: Decimal): string {
    return `by (${dx.toString()},${dy.toString()})`;
  }

  override details(): string[] {
    const children = this.#children.map((child) => child.label()).join(', ') || '(none)';
    return [`children: ${children}`, this.styleText()].filter(Boolean);
  }

  override createSignature(): CreateSignature {
    return { required: [] };
  }
}
