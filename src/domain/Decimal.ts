import { EditorError } from '#domain/EditorError.ts';

/**
 * Decimal is an immutable value object for every number that the editor handles. It reads the
 * number grammar of SVG and writes at most 6 fraction digits, so float noise such as
 * 0.30000000000000004 never shows.
 */
export class Decimal {
  static readonly #grammar = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
  static readonly #format = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 6,
    useGrouping: false,
    signDisplay: 'negative',
  });

  readonly #value: number;

  constructor(value: number) {
    this.#value = value;
  }

  static parse(text: string): Decimal {
    const value = Number(text);
    if (!Decimal.#grammar.test(text) || !Number.isFinite(value)) {
      throw new EditorError(`invalid number: ${text}`);
    }
    return new Decimal(value);
  }

  plus(other: Decimal): Decimal {
    return new Decimal(this.#value + other.#value);
  }

  times(other: Decimal): Decimal {
    return new Decimal(this.#value * other.#value);
  }

  negated(): Decimal {
    return new Decimal(-this.#value);
  }

  isNegative(): boolean {
    return this.#value < 0;
  }

  isPositive(): boolean {
    return this.#value > 0;
  }

  toString(): string {
    return Decimal.#format.format(this.#value);
  }
}
