import { Decimal } from '#domain/Decimal.ts';
import { EditorError } from '#domain/EditorError.ts';
import { Group } from '#domain/Group.ts';

/** The `<svg>` root: a group without an id that also holds the canvas size. */
export class Canvas extends Group {
  override readonly tag = 'svg';
  #width = new Decimal(0);
  #height = new Decimal(0);

  constructor(width: Decimal, height: Decimal) {
    super('');
    this.resize(width, height);
  }

  resize(width: Decimal, height: Decimal): void {
    if (!width.isPositive() || !height.isPositive()) {
      throw new EditorError('canvas size must be positive');
    }
    this.#width = width;
    this.#height = height;
  }

  override label(): string {
    return 'svg';
  }

  override describe(): string {
    return `(${this.#width.toString()}x${this.#height.toString()})`;
  }

  protected override ownAttributes(): Array<[string, string]> {
    const width = this.#width.toString();
    const height = this.#height.toString();
    return [
      ['xmlns', 'http://www.w3.org/2000/svg'],
      ['width', width],
      ['height', height],
      ['viewBox', `0 0 ${width} ${height}`],
    ];
  }
}
