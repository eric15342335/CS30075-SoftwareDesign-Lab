import type { AttributeEdit } from '#domain/AttributeEdit.ts';
import type { AttributeHandler } from '#domain/AttributeHandler.ts';
import type { Shape } from '#domain/Shape.ts';

type Script = (shape: Shape, value: string, edit: AttributeEdit) => void;

/**
 * A test attribute handler. It is responsible for one attribute on every shape of one type, and it
 * runs the script that the test gives it.
 */
export class ScriptedHandler implements AttributeHandler {
  readonly name: string;
  readonly #type: string;
  readonly #attr: string;
  readonly #script: Script;

  constructor(name: string, type: string, attr: string, script: Script) {
    this.name = name;
    this.#type = type;
    this.#attr = attr;
    this.#script = script;
  }

  handles(shape: Shape, attr: string): boolean {
    return shape.type === this.#type && attr === this.#attr;
  }

  apply(shape: Shape, _attr: string, value: string, edit: AttributeEdit): void {
    this.#script(shape, value, edit);
  }
}
