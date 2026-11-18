import { AttributeEdit } from '#domain/AttributeEdit.ts';
import type { Canvas } from '#domain/Canvas.ts';
import type { Catalog } from '#domain/Catalog.ts';
import type { Decimal } from '#domain/Decimal.ts';
import { EditorError } from '#domain/EditorError.ts';
import { Group } from '#domain/Group.ts';
import { Journal } from '#domain/Journal.ts';
import type { Memento } from '#domain/Memento.ts';
import { Placement } from '#domain/Placement.ts';
import type { Shape } from '#domain/Shape.ts';
import { StandardAttributes } from '#domain/StandardAttributes.ts';

/**
 * SvgDocument is the receiver of every edit command. It validates each request, raises the error
 * messages from the spec, and returns a memento with only the state that undo needs. A failed
 * request changes nothing.
 */
export class SvgDocument {
  static readonly #idPattern = /^\S+$/;
  static readonly #standard = new StandardAttributes();
  readonly #canvas: Canvas;
  readonly #catalog: Catalog;

  constructor(canvas: Canvas, catalog: Catalog) {
    this.#canvas = canvas;
    this.#catalog = catalog;
  }

  get canvas(): Canvas {
    return this.#canvas;
  }

  find(id: string): Shape {
    const shape = this.#lookup(id);
    if (shape === undefined) throw new EditorError(`no such shape: ${id}`);
    return shape;
  }

  /** Counts the elements below the root, the way that `save` and `read` count them. */
  count(): number {
    return this.#shapes().reduce((count) => count + 1, 0);
  }

  /** Returns every id in document order, for tab completion. */
  ids(): string[] {
    return this.#shapes()
      .map((shape) => shape.id)
      .toArray();
  }

  create(type: string, id: string, args: readonly string[], containerId?: string): Placement {
    const shape = this.#catalog.createShape(type, id);
    this.#claim(id);
    const parent = containerId === undefined ? this.#canvas : this.#container(containerId);
    shape.configure(args, this.#catalog);
    // A composite shape built parts in configure(). Their ids must be free as well.
    for (const part of shape.walk().drop(1)) this.#claim(part.id, shape);
    const placement = new Placement(shape);
    parent.insert(shape);
    return placement;
  }

  delete(id: string): Placement {
    const shape = this.find(id);
    this.#detachable(shape);
    const placement = new Placement(shape);
    shape.parent?.remove(shape);
    return placement;
  }

  move(id: string, dx: Decimal, dy: Decimal): Memento {
    const shape = this.find(id);
    const memento = shape.saveGeometry();
    SvgDocument.#allOrNothing(memento, () => shape.move(dx, dy));
    return memento;
  }

  scale(id: string, factor: Decimal): Memento {
    const shape = this.find(id);
    if (!factor.isPositive()) throw new EditorError('scale factor must be positive');
    const memento = shape.saveGeometry();
    SvgDocument.#allOrNothing(memento, () => shape.scale(factor));
    return memento;
  }

  /** Runs a geometry edit. If it fails partway, for example in the last child of a group, the edit is undone. */
  static #allOrNothing(memento: Memento, edit: () => void): void {
    try {
      edit();
    } catch (error) {
      memento.restore();
      throw error;
    }
  }

  /**
   * Routes `set` through the attribute handlers (ADR 1). Two responsible handlers are a conflict,
   * and the command fails before anything changes. With none, the standard Phase 1 rules apply.
   * When a handler throws, every write that it made is restored and no fallback runs.
   */
  set(id: string, name: string, value: string): AttributeEdit {
    const shape = this.find(id);
    const handlers = this.#catalog.handlersFor(shape, name);
    if (handlers.length > 1) {
      const names = handlers.map((handler) => handler.name).join(', ');
      throw new EditorError(
        `conflicting attribute handlers for ${name} on ${shape.label()}: ${names}`,
      );
    }
    const edit = new AttributeEdit();
    const [handler] = handlers;
    if (handler === undefined) {
      SvgDocument.#standard.apply(shape, name, value, edit);
      return edit;
    }
    try {
      handler.apply(shape, name, value, edit);
    } catch (error) {
      edit.restore();
      const reason = error instanceof Error ? error.message : String(error);
      throw new EditorError(`attribute handler failed: ${handler.name} (${reason})`);
    }
    return edit;
  }

  /**
   * Puts the members into a new group. They leave their parents in document order, and the new
   * group takes the place of the first member.
   */
  group(id: string, memberIds: readonly string[]): Journal {
    this.#claim(id);
    const chosen = new Set(memberIds.map((memberId) => this.find(memberId)));
    for (const member of chosen) {
      this.#detachable(member);
      if (
        member
          .walk()
          .drop(1)
          .some((inner) => chosen.has(inner))
      ) {
        throw new EditorError(`cannot group a container into its own descendant: ${member.id}`);
      }
    }
    const members = this.#shapes()
      .filter((shape) => chosen.has(shape))
      .toArray();
    const [first] = members;
    if (first === undefined) throw new EditorError('group needs at least one shape');
    const group = new Group(id);
    const steps: Memento[] = [new Placement(group)];
    first.before(group);
    for (const member of members) {
      steps.push(new Placement(member));
      group.insert(member);
    }
    return new Journal(steps);
  }

  /** Removes a container. Its children take its place in its parent and keep their order. */
  ungroup(id: string): Journal {
    const container = this.find(id).asGroup();
    if (container === null) throw new EditorError(`not a container: ${id}`);
    if (!container.dissolvable()) throw new EditorError(`cannot ungroup composite shape: ${id}`);
    this.#detachable(container);
    if (container.parent === this.#canvas) {
      throw new EditorError(`cannot ungroup top-level container: ${id}`);
    }
    const steps: Memento[] = [];
    for (const child of container.children()) {
      steps.push(new Placement(child));
      container.before(child);
    }
    steps.push(new Placement(container));
    container.parent?.remove(container);
    return new Journal(steps);
  }

  addto(groupId: string, id: string): Placement {
    const group = this.#container(groupId);
    const shape = this.find(id);
    this.#detachable(shape);
    if (shape.walk().some((inner) => inner === group)) {
      throw new EditorError(`cannot group a container into its own descendant: ${id}`);
    }
    const placement = new Placement(shape);
    group.insert(shape);
    return placement;
  }

  /** Later siblings are painted on top, so the front is the end of the child list. */
  front(id: string): Placement {
    const shape = this.find(id);
    const placement = new Placement(shape);
    shape.parent?.insert(shape);
    return placement;
  }

  back(id: string): Placement {
    const shape = this.find(id);
    const placement = new Placement(shape);
    shape.parent?.insert(shape, 0);
    return placement;
  }

  // ponytail: Each lookup walks the whole tree in O(n). Add an id index if documents get large.
  #shapes() {
    return this.#canvas.walk().drop(1);
  }

  #lookup(id: string): Shape | undefined {
    return this.#shapes().find((shape) => shape.id === id);
  }

  #container(id: string): Group {
    const shape = this.#lookup(id);
    if (shape === undefined) throw new EditorError(`no such container: ${id}`);
    const group = shape.asGroup();
    if (group === null) throw new EditorError(`not a container: ${id}`);
    return group;
  }

  /**
   * Checks that an id is valid and free. The canvas may keep an id from a file, and the new shape
   * itself is not in the document yet, so its parts are checked against it too.
   */
  #claim(id: string, building?: Shape): void {
    if (!SvgDocument.#idPattern.test(id)) throw new EditorError(`invalid id: "${id}"`);
    const taken =
      this.#lookup(id) !== undefined ||
      this.#canvas.attributes().some(([name, value]) => name === 'id' && value === id) ||
      [...(building?.walk() ?? [])].filter((shape) => shape.id === id).length > 1;
    if (taken) throw new EditorError(`id already exists: ${id}`);
  }

  /** A part of a composite shape must stay inside it, so delete, addto and group refuse it. */
  #detachable(shape: Shape): void {
    if (shape.parent?.holds(shape) === true) {
      throw new EditorError(`cannot remove a part of a composite shape: ${shape.id}`);
    }
  }
}
