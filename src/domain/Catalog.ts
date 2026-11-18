import type { AttributeHandler } from '#domain/AttributeHandler.ts';
import { EditorError } from '#domain/EditorError.ts';
import { Registry } from '#domain/Registry.ts';
import type { Shape } from '#domain/Shape.ts';
import type { ShapeProvider } from '#domain/ShapeProvider.ts';

/**
 * Catalog holds the shape types and the attribute handlers that the document knows. The kernel
 * looks them up here, so it has no list of shape classes or attribute rules of its own.
 */
export class Catalog {
  readonly shapes = new Registry<ShapeProvider>('shapes', (provider) => provider.type);
  readonly handlers = new Registry<AttributeHandler>('attributes', (handler) => handler.name);

  /** Returns the registered handlers that say they are responsible, in registration order. */
  handlersFor(shape: Shape, attr: string): AttributeHandler[] {
    return this.handlers.values().filter((handler) => handler.handles(shape, attr));
  }

  createShape(type: string, id: string): Shape {
    const provider = this.shapes.get(type);
    if (provider === undefined) {
      throw new EditorError(`unknown shape type: ${type} (is the plugin loaded?)`);
    }
    return provider.create(id);
  }

  /** Tells whether `read` can turn an element with this tag name into a shape. */
  reads(tag: string): boolean {
    return this.shapes.get(tag) !== undefined;
  }

  /**
   * Creates the shape for an element that `read` found. The type in `data-kind` wins when its
   * shape has the same tag as the element. Otherwise, the tag name decides.
   */
  readShape(tag: string, kind: string | undefined, id: string): Shape {
    const special = kind === undefined ? undefined : this.shapes.get(kind)?.create(id);
    return special?.tag === tag ? special : this.createShape(tag, id);
  }

  /** Returns the `create` syntax of each type, in the order of registration, for `help`. */
  usages(): string[] {
    return this.shapes.values().map((provider) => provider.create('').createUsage());
  }
}
