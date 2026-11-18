import type { CommandProvider } from '#command/CommandProvider.ts';
import { Catalog } from '#domain/Catalog.ts';
import { Registry } from '#domain/Registry.ts';

/**
 * Extensions holds everything that the built-in code and the plugins have registered. The kernel
 * reads these registries and never lists concrete extensions itself.
 */
export class Extensions {
  readonly catalog = new Catalog();
  readonly commands = new Registry<CommandProvider>('commands', (provider) => provider.name);
}
