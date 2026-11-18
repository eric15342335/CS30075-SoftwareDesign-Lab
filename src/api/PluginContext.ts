import type { CommandProvider } from '#command/CommandProvider.ts';
import type { TreeDecorator } from '#command/TreeDecorator.ts';
import type { WorkspaceObserver } from '#command/WorkspaceObserver.ts';
import type { AttributeHandler } from '#domain/AttributeHandler.ts';
import type { ShapeProvider } from '#domain/ShapeProvider.ts';

/**
 * The context that a plugin gets in `activate`. Each method registers one extension. The
 * registrations take effect only after `activate` returns and every check has passed. After that,
 * the context is closed and every method throws.
 */
export interface PluginContext {
  /** The `options` object of the plugin's entry in the config file, or an empty object. */
  readonly options: Readonly<Record<string, unknown>>;
  addShape(provider: ShapeProvider): void;
  addCommand(provider: CommandProvider): void;
  addDecorator(decorator: TreeDecorator): void;
  addAttributeHandler(handler: AttributeHandler): void;
  observe(observer: WorkspaceObserver): void;
}
