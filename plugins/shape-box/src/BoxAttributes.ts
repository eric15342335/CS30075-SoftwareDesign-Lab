import { EditorError } from '@svgframe/api';
import type { AttributeEdit, AttributeHandler, Shape } from '@svgframe/api';

/**
 * BoxAttributes gives two attributes of a box their meaning. `fill` goes to the rect part, and
 * `label` rewrites the text part. It finds the parts by their derived ids and writes only through
 * the edit, so one undo restores them.
 */
export class BoxAttributes implements AttributeHandler {
  readonly name = 'box-attributes';

  handles(shape: Shape, attr: string): boolean {
    return shape.type === 'box' && (attr === 'fill' || attr === 'label');
  }

  apply(shape: Shape, attr: string, value: string, edit: AttributeEdit): void {
    if (attr === 'fill') {
      const rect = BoxAttributes.#part(shape, 'rect');
      edit.set(rect, 'fill', value);
      edit.report(
        `${shape.label()} fill propagated to ${rect.id}`,
        `${shape.label()} fill restored on ${rect.id}`,
      );
      return;
    }
    const change = edit.set(BoxAttributes.#part(shape, 'label'), 'text', value);
    edit.report(
      `${shape.label()} label updated: "${value}"`,
      `${shape.label()} label restored: "${change.old ?? ''}"`,
    );
  }

  static #part(shape: Shape, name: string): Shape {
    const id = `${shape.id}-${name}`;
    const part = shape.children().find((child) => child.id === id);
    if (part === undefined) throw new EditorError(`box ${shape.id} has no part ${id}`);
    return part;
  }
}
