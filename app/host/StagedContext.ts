import type { PluginContext } from '#api/PluginContext.ts';
import type { CommandProvider } from '#command/CommandProvider.ts';
import type { Extensions } from '#command/Extensions.ts';
import type { TreeDecorator } from '#command/TreeDecorator.ts';
import type { WorkspaceObserver } from '#command/WorkspaceObserver.ts';
import type { AttributeHandler } from '#domain/AttributeHandler.ts';
import { EditorError } from '#domain/EditorError.ts';
import type { ShapeProvider } from '#domain/ShapeProvider.ts';
import { StagedBatch } from '#host/StagedBatch.ts';

/**
 * StagedContext is the context that one plugin activates into. It collects the registrations and
 * touches the real registries only in `commit`, so a failing plugin leaves no trace. After the
 * commit or `close`, the context refuses every registration.
 */
export class StagedContext implements PluginContext {
  readonly options: Readonly<Record<string, unknown>>;
  readonly #shapes: StagedBatch<ShapeProvider>;
  readonly #commands: StagedBatch<CommandProvider>;
  readonly #decorators: StagedBatch<TreeDecorator>;
  readonly #handlers: StagedBatch<AttributeHandler>;
  readonly #observers: StagedBatch<WorkspaceObserver>;
  #open = true;

  constructor(extensions: Extensions, options: Readonly<Record<string, unknown>>) {
    this.options = options;
    this.#shapes = new StagedBatch(extensions.catalog.shapes);
    this.#commands = new StagedBatch(extensions.commands);
    this.#decorators = new StagedBatch(extensions.decorators);
    this.#handlers = new StagedBatch(extensions.catalog.handlers);
    this.#observers = new StagedBatch(extensions.observers);
  }

  addShape(provider: ShapeProvider): void {
    this.#stage(this.#shapes, provider);
  }

  addCommand(provider: CommandProvider): void {
    this.#stage(this.#commands, provider);
  }

  addDecorator(decorator: TreeDecorator): void {
    this.#stage(this.#decorators, decorator);
  }

  addAttributeHandler(handler: AttributeHandler): void {
    this.#stage(this.#handlers, handler);
  }

  observe(observer: WorkspaceObserver): void {
    this.#stage(this.#observers, observer);
  }

  /** Throws when a staged name is taken already or staged twice. */
  check(): void {
    for (const batch of this.#batches()) batch.check();
  }

  /** Returns the "category/name" key of every staged extension. */
  registered(): string[] {
    return this.#batches().flatMap((batch) => batch.keys());
  }

  /** Adds everything to the real registries and closes the context. Call `check` first. */
  commit(): void {
    this.close();
    for (const batch of this.#batches()) batch.commit();
  }

  close(): void {
    this.#open = false;
  }

  #stage<T>(batch: StagedBatch<T>, item: T): void {
    if (!this.#open) throw new EditorError('the plugin context is closed');
    batch.push(item);
  }

  #batches(): Pick<StagedBatch<never>, 'check' | 'keys' | 'commit'>[] {
    return [this.#shapes, this.#commands, this.#decorators, this.#handlers, this.#observers];
  }
}
