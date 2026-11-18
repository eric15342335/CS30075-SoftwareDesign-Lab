import { expect, test } from 'bun:test';

import type { PluginContext } from '#api/PluginContext.ts';
import { BasicShapeProvider } from '#domain/BasicShapeProvider.ts';
import { Circle } from '#domain/Circle.ts';
import { PluginHost } from '#host/PluginHost.ts';
import { EchoProvider } from '#test/support/EchoProvider.ts';
import { FixedDecorator } from '#test/support/FixedDecorator.ts';
import { MemorySource } from '#test/support/MemorySource.ts';
import { RecordingObserver } from '#test/support/RecordingObserver.ts';
import { ScriptedHandler } from '#test/support/ScriptedHandler.ts';
import { Session } from '#test/support/Session.ts';

type Activate = (context: PluginContext) => void;

/**
 * Returns a plugin class for the default export. `new` on a plain function returns the object
 * that the function returns, so the class needs no class syntax of its own.
 */
function pluginClass(activate: Activate): unknown {
  return function Scripted() {
    return { activate };
  };
}

/** Returns a source whose package declares `contributes` and whose plugin runs `activate`. */
function source(
  name: string,
  contributes: Record<string, string[]>,
  activate: Activate,
  options?: Record<string, unknown>,
): MemorySource {
  return new MemorySource(name, { name, contributes }, { default: pluginClass(activate) }, options);
}

const dot = new BasicShapeProvider('dot', Circle);
const blob = new BasicShapeProvider('blob', Circle);

/** Lists the names in every registry, so a test can see that a failed plugin left nothing. */
function registered(extensions = Session.extensions()): string[] {
  return [
    ...extensions.catalog.shapes.values().map((provider) => `shapes/${provider.type}`),
    ...extensions.commands.values().map((provider) => `commands/${provider.name}`),
    ...extensions.decorators.values().map((decorator) => `decorators/${decorator.name}`),
    ...extensions.catalog.handlers.values().map((handler) => `attributes/${handler.name}`),
    ...extensions.observers.values().map((observer) => `observers/${observer.name}`),
  ];
}

test('a success, then a failure, then a success: the failed plugin leaves nothing behind', async () => {
  const extensions = Session.extensions();
  const before = registered(extensions);
  const errors = await new PluginHost(extensions).installAll([
    source('a', { shapes: ['dot'], commands: ['echo'] }, (context) => {
      context.addShape(dot);
      context.addCommand(new EchoProvider('echo'));
    }),
    source('b', { shapes: ['blob'], decorators: ['star'], observers: ['spy'] }, (context) => {
      context.addShape(blob);
      context.addDecorator(new FixedDecorator('star', () => '*'));
      context.observe(new RecordingObserver('spy'));
      throw new Error('boom');
    }),
    source('c', { attributes: ['fills'] }, (context) => {
      context.addAttributeHandler(new ScriptedHandler('fills', 'dot', 'fill', () => {}));
    }),
  ]);
  expect(errors).toEqual(['plugin failed to activate: b (boom)']);
  expect(registered(extensions)).toEqual([
    ...before.filter((key) => key.startsWith('shapes/')),
    'shapes/dot',
    ...before.filter((key) => key.startsWith('commands/')),
    'commands/echo',
    'attributes/fills',
  ]);
});

test('a plugin can see what the plugins before it registered', async () => {
  const extensions = Session.extensions();
  const host = new PluginHost(extensions);
  await host.install(source('a', { shapes: ['dot'] }, (context) => context.addShape(dot)));
  expect(await host.install(source('b', { shapes: ['dot'] }, (c) => c.addShape(dot)))).toBe(
    'duplicate registration: shapes/dot',
  );
});

test('a name that a built-in extension holds is refused, and nothing of the plugin stays', async () => {
  const extensions = Session.extensions();
  const before = registered(extensions);
  const error = await new PluginHost(extensions).install(
    source('a', { commands: ['echo'], shapes: ['rect'] }, (context) => {
      context.addCommand(new EchoProvider('echo'));
      context.addShape(new BasicShapeProvider('rect', Circle));
    }),
  );
  expect(error).toBe('duplicate registration: shapes/rect');
  expect(registered(extensions)).toEqual(before);
});

test('a name that one plugin registers twice is refused', async () => {
  const error = await new PluginHost(Session.extensions()).install(
    source('a', { decorators: ['star', 'star'] }, (context) => {
      context.addDecorator(new FixedDecorator('star', () => '*'));
      context.addDecorator(new FixedDecorator('star', () => '+'));
    }),
  );
  expect(error).toBe('duplicate registration: decorators/star');
});

test.each([
  [{}, () => {}, 'declared: none, registered: none', true],
  [
    { shapes: ['dot'] },
    (c: PluginContext) => c.addCommand(new EchoProvider('echo')),
    'declared: shapes/dot, registered: commands/echo',
    false,
  ],
  [
    { commands: ['echo', 'beep'] },
    (c: PluginContext) => c.addCommand(new EchoProvider('echo')),
    'declared: commands/beep, commands/echo, registered: commands/echo',
    false,
  ],
  [{}, (c: PluginContext) => c.addShape(dot), 'declared: none, registered: shapes/dot', false],
])(
  'the manifest %j must list what the plugin registers',
  async (contributes, activate, lists, fine) => {
    const error = await new PluginHost(Session.extensions()).install(
      source('m', contributes, activate),
    );
    expect(error).toBe(fine ? undefined : `plugin manifest mismatch: m (${lists})`);
  },
);

test.each([
  [null, 'not an object'],
  [{ contributes: {} }, 'no package name'],
  [{ name: '' }, 'no package name'],
  [{ name: 'm', contributes: ['shapes'] }, 'contributes is not an object'],
  [{ name: 'm', contributes: { colors: [] } }, 'unknown category: colors'],
  [{ name: 'm', contributes: { shapes: 'dot' } }, 'shapes is not a list of names'],
  [{ name: 'm', contributes: { shapes: [1] } }, 'shapes is not a list of names'],
])('the manifest %j is refused before the entry module loads', async (manifest, reason) => {
  const entry = { default: new Error('the entry must not load') };
  const error = await new PluginHost(Session.extensions()).install(
    new MemorySource('pkg', manifest, entry),
  );
  expect(error).toBe(`invalid plugin manifest: pkg (${reason})`);
});

test('an import that fails, for the manifest or for the entry, is a load failure', async () => {
  const host = new PluginHost(Session.extensions());
  const manifest = { name: 'pkg' };
  expect(await host.install(new MemorySource('pkg', new Error('bad json'), {}))).toBe(
    'plugin failed to load: pkg (bad json)',
  );
  expect(await host.install(new MemorySource('pkg', manifest, new Error('top-level throw')))).toBe(
    'plugin failed to load: pkg (top-level throw)',
  );
  expect(await host.install(new MemorySource('pkg', manifest, { default: 'nope' }))).toBe(
    'plugin failed to activate: pkg (the default export is not a class)',
  );
  expect(await host.install(new MemorySource('pkg', manifest, {}))).toBe(
    'plugin has no default export: pkg',
  );
  expect(await host.install(new MemorySource('pkg', manifest, 'not a module'))).toBe(
    'plugin has no default export: pkg',
  );
});

test('the context gives the options and closes after the install, also after a failure', async () => {
  const contexts: PluginContext[] = [];
  const keep = (context: PluginContext): void => {
    contexts.push(context);
  };
  const host = new PluginHost(Session.extensions());
  await host.install(source('a', {}, keep, { size: 2 }));
  await host.install(
    source('b', {}, (context) => {
      keep(context);
      throw new Error('boom');
    }),
  );
  expect(contexts.map((context) => context.options)).toEqual([{ size: 2 }, {}]);
  for (const context of contexts) {
    expect(() => context.addShape(dot)).toThrow('the plugin context is closed');
  }
});
