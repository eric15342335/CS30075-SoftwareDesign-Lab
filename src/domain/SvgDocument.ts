import { AttributeMemento } from '#domain/AttributeMemento.ts';
import type { Canvas } from '#domain/Canvas.ts';
import type { Decimal } from '#domain/Decimal.ts';
import { EditorError } from '#domain/EditorError.ts';
import { Group } from '#domain/Group.ts';
import { Journal } from '#domain/Journal.ts';
import type { Memento } from '#domain/Memento.ts';
import { Placement } from '#domain/Placement.ts';
import type { Shape } from '#domain/Shape.ts';
import { ShapeFactory } from '#domain/ShapeFactory.ts';

/**
 * SvgDocument is the receiver of every edit command. It validates each request, raises the error
 * messages from the spec, and returns a memento with only the state that undo needs. A failed
 * request changes nothing.
 */
export class SvgDocument {
  static readonly #idPattern = /^\S+$/;
  readonly #canvas: Canvas;
  readonly #factory = new ShapeFactory();

  constructor(canvas: Canvas) {
    this.#canvas = canvas;
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
    const shape = this.#factory.create(type, id);
    this.#claim(id);
    const parent = containerId === undefined ? this.#canvas : this.#container(containerId);
    this.#configure(shape, args);
    const placement = new Placement(shape);
    parent.insert(shape);
    return placement;
  }

  delete(id: string): Placement {
    const shape = this.find(id);
    const placement = new Placement(shape);
    shape.parent?.remove(shape);
    return placement;
  }

  move(id: string, dx: Decimal, dy: Decimal): Memento {
    const shape = this.find(id);
    const memento = shape.saveGeometry();
    shape.move(dx, dy);
    return memento;
  }

  scale(id: string, factor: Decimal): Memento {
    const shape = this.find(id);
    if (!factor.isPositive()) throw new EditorError('scale factor must be positive');
    const memento = shape.saveGeometry();
    shape.scale(factor);
    return memento;
  }

  set(id: string, name: string, value: string): AttributeMemento {
    const shape = this.find(id);
    return new AttributeMemento(shape, name, shape.setAttribute(name, value));
  }

  /**
   * Puts the members into a new group. They leave their parents in document order, and the new
   * group takes the place of the first member.
   */
  group(id: string, memberIds: readonly string[]): Journal {
    this.#claim(id);
    const chosen = new Set(memberIds.map((memberId) => this.find(memberId)));
    for (const member of chosen) {
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

  #claim(id: string): void {
    if (!SvgDocument.#idPattern.test(id)) throw new EditorError(`invalid id: "${id}"`);
    if (this.#lookup(id) !== undefined) throw new EditorError(`id already exists: ${id}`);
  }

  #configure(shape: Shape, args: readonly string[]): void {
    const { required, optional } = shape.createSignature();
    const names = optional === undefined ? required : [...required, optional];
    if (args.length < required.length || args.length > names.length) {
      throw new EditorError(`usage: ${shape.createUsage()}`);
    }
    for (const [index, name] of names.entries()) {
      const arg = args[index];
      if (arg !== undefined) shape.setAttribute(name, arg);
    }
  }
}
