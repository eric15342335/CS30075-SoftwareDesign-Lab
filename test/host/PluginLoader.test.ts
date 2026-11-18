import { expect, test } from 'bun:test';

import { Group } from '#domain/Group.ts';
import { PluginHost } from '#host/PluginHost.ts';
import { PluginLoader } from '#host/PluginLoader.ts';
import { repo } from '#test/support/Paths.ts';
import { Session } from '#test/support/Session.ts';

test('the loader finds plugins by package name and by a path relative to the config file', async () => {
  const extensions = Session.extensions();
  const loaders = ['@svgframe/plugin-shape-box', './plugins/tree-star'].map(
    (module) => new PluginLoader(repo.shippedConfig, module, {}),
  );
  expect(await new PluginHost(extensions).installAll(loaders)).toEqual([]);
  // A second copy of the kernel would give the plugin its own Group class (seen once under Stryker).
  expect(extensions.catalog.createShape('box', 'n1')).toBeInstanceOf(Group);
  expect(extensions.decorators.values().map((decorator) => decorator.name)).toContain(
    'modified-star',
  );
});
