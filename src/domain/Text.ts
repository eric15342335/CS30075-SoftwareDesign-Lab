import { Leaf } from '#domain/Leaf.ts';
import type { CreateSignature } from '#domain/Shape.ts';

/** In SVG the content is the element's child text, so it counts as an attribute only for `set`. */
export class Text extends Leaf {
  override readonly tag = 'text';
  #content = '';

  override textContent(): string {
    return this.#content;
  }

  override loadText(text: string): void {
    this.#content = text;
  }

  override details(): string[] {
    return [...super.details(), `text="${this.#content}"`];
  }

  override createSignature(): CreateSignature {
    return { required: [...super.createSignature().required, 'text'] };
  }

  protected override geometry() {
    return { x: 'x', y: 'y' } as const;
  }

  protected override summary(): string {
    return `(${this.value('x')},${this.value('y')}) "${this.#content}"`;
  }

  protected override assign(name: string, value: string | undefined) {
    if (name !== 'text') return super.assign(name, value);
    const old = this.#content;
    this.#content = value ?? '';
    return { old };
  }
}
