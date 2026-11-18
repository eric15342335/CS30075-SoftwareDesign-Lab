import { expect, test } from 'bun:test';
import { writeFileSync } from 'node:fs';

import { CliProgram } from '#cli/CliProgram.ts';
import { CommandExecutor } from '#command/CommandExecutor.ts';
import { Workspace } from '#command/Workspace.ts';
import { Assembly } from '#host/Assembly.ts';
import { PluginConfig } from '#host/PluginConfig.ts';
import { PluginHost } from '#host/PluginHost.ts';
import { CliProcess } from '#test/support/CliProcess.ts';
import { MemorySource } from '#test/support/MemorySource.ts';
import { repo } from '#test/support/Paths.ts';
import { Session } from '#test/support/Session.ts';
import { TempFolder } from '#test/support/TempFolder.ts';

const failures = repo.fixture('configs', 'failures.config.json');

/** Writes a config file with the text into the folder and returns its path. */
function config(folder: TempFolder, name: string, text: string): string {
  const path = folder.file(name);
  writeFileSync(path, text);
  return path;
}

const expected = [
  'plugin not found: missing-plugin',
  'plugin failed to load: @svgframe/fixture-throws-on-load (broken at load)',
  'plugin has no default export: @svgframe/fixture-no-default',
  'plugin manifest mismatch: @svgframe/fixture-mismatch (declared: decorators/declared, registered: decorators/other)',
  'plugin failed to activate: @svgframe/fixture-bad-activate (activate failed on purpose)',
  'duplicate registration: shapes/rect',
];

test('every failure row gives its message in config order, and the good plugin still loads', async () => {
  const extensions = Session.extensions();
  const shapes = extensions.catalog.shapes.values();
  const sources = PluginConfig.read(failures).sources();
  expect(sources.map((source) => source.module)).not.toContain('missing-but-disabled');
  expect(await new PluginHost(extensions).installAll(sources)).toEqual(expected);
  // Only the mark plugin got in. Its options reached it, and bad-activate left no observer.
  expect(extensions.catalog.shapes.values()).toEqual(shapes);
  expect(extensions.decorators.values().map((decorator) => decorator.name)).toEqual(['mark']);
  expect(extensions.observers.values()).toEqual([]);
  const workspace = new Workspace(extensions.catalog, extensions.observers.values());
  const program = new CliProgram(workspace, new CommandExecutor(), extensions);
  program.run('init');
  expect(program.run('tree')).toEqual(['svg (800x600) A']);
});

test.each([
  ['missing.json', null, 'cannot read the file'],
  ['broken.json', '{ "plugins": [', 'not valid JSON'],
  ['array.json', '[]', 'no plugins list'],
  ['object.json', '{ "plugins": {} }', 'plugins is not a list'],
  ['entry.json', '{ "plugins": ["x"] }', 'entry 1 is not an object'],
  ['empty.json', '{ "plugins": [{ "module": "" }] }', 'entry 1 has no module'],
  [
    'enabled.json',
    '{ "plugins": [{ "module": "x", "enabled": "no" }] }',
    'entry 1: enabled is not true or false',
  ],
  [
    'options.json',
    '{ "plugins": [{ "module": "x", "options": [] }] }',
    'entry 1: options is not an object',
  ],
  [
    'late.json',
    '{ "plugins": [{ "module": "@svgframe/fixture-throws-on-load" }, { "module": 3 }] }',
    'entry 2 has no module',
  ],
])('the config %s is refused as a whole, so no plugin loads', (name, text, reason) => {
  using folder = new TempFolder();
  const path = text === null ? folder.file(name) : config(folder, name, text);
  const assembly = Assembly.from(['--config', path], []);
  expect(assembly.sources).toEqual([]);
  expect(assembly.problems).toEqual([`invalid plugin config: ${path} (${reason})`]);
});

test('the command line picks mode A, mode B or no plugins', () => {
  const shipped = [new MemorySource('shipped', { name: 'shipped' }, {})];
  const empty = repo.fixture('configs', 'empty.config.json');
  expect(Assembly.from([], shipped).sources).toBe(shipped);
  expect(Assembly.from(['--config', empty], shipped).sources).toEqual([]);
  expect(Assembly.from(['--no-plugins', '--config', failures], shipped).sources).toEqual([]);
  expect(Assembly.from(['--config'], shipped).problems).toEqual([
    'invalid plugin config:  (cannot read the file)',
  ]);
});

test('the real program loads a config from another folder and prints the problems after the banner', async () => {
  using folder = new TempFolder();
  const cli = new CliProcess();
  const { stdout, code } = await cli.run(['--config', failures], 'init\ntree\n', folder.path);
  expect(code).toBe(0);
  expect(stdout.split('\n')).toEqual([
    "svg-editor 0.1 — type 'help' for commands",
    ...expected.map((line) => `error: ${line}`),
    '',
    'svg> init',
    'canvas 800x600 created',
    'svg> tree',
    'svg (800x600) A',
    '',
  ]);
});
