import { Decimal } from '#domain/Decimal.ts';
import { EditorError } from '#domain/EditorError.ts';
import { GeometryMemento } from '#domain/GeometryMemento.ts';
import { type CreateSignature, Shape } from '#domain/Shape.ts';

/** Says what `move` adds to a geometry attribute: dx, dy, or nothing for a size. */
type Axis = 'x' | 'y' | 'size';

/**
 * Leaf applies the Template Method pattern. Move, scale, set and output are written once here,
 * and each subclass declares its geometry.
 */
export abstract class Leaf extends Shape {
  static readonly #zero = new Decimal(0);
  readonly #geometry = new Map(Object.keys(this.geometry()).map((key) => [key, Leaf.#zero]));

  /** The geometry attributes in SVG order. The first two form the anchor point that `move` reports. */
  protected abstract geometry(): Readonly<Record<string, Axis>>;

  override move(dx: Decimal, dy: Decimal): void {
    const delta = { x: dx, y: dy, size: Leaf.#zero };
    for (const [key, axis] of Object.entries(this.geometry())) {
      this.#geometry.set(key, this.#get(key).plus(delta[axis]));
    }
  }

  override scale(factor: Decimal): void {
    for (const [key, value] of this.#geometry) this.#geometry.set(key, value.times(factor));
  }

  override saveGeometry(): GeometryMemento {
    return new GeometryMemento(this.#geometry);
  }

  override movedPhrase(): string {
    const [x = Leaf.#zero, y = Leaf.#zero] = this.#geometry.values();
    return `to (${x.toString()},${y.toString()})`;
  }

  override details(): string[] {
    return [this.#geometryText(), this.styleText()].filter(Boolean);
  }

  override createSignature(): CreateSignature {
    return { required: Object.keys(this.geometry()), optional: 'fill' };
  }

  protected override summary(): string {
    return this.#geometryText();
  }

  protected override ownAttributes(): Array<[string, string]> {
    return [...super.ownAttributes(), ...this.#formatted()];
  }

  protected override assign(name: string, value: string | undefined) {
    const old = this.#geometry.get(name);
    if (old === undefined) return super.assign(name, value);
    // In SVG, a missing geometry attribute means 0.
    const number = value === undefined ? Leaf.#zero : Decimal.parse(value);
    if (number.isNegative() && this.geometry()[name] === 'size') {
      throw new EditorError(`${name} must not be negative`);
    }
    this.#geometry.set(name, number);
    return { old: old.toString() };
  }

  protected value(key: string): string {
    return this.#get(key).toString();
  }

  #get(key: string): Decimal {
    return this.#geometry.get(key) ?? Leaf.#zero;
  }

  *#formatted(): Generator<[string, string]> {
    for (const [key, value] of this.#geometry) yield [key, value.toString()];
  }

  #geometryText(): string {
    return this.#formatted()
      .map(([key, value]) => `${key}=${value}`)
      .toArray()
      .join(' ');
  }
}
