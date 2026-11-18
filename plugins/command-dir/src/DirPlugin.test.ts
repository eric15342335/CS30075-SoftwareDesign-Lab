import { expect, test } from 'bun:test';

import type { PluginContext } from '@svgframe/api';
import { PluginHarness } from '@svgframe/testing';

import type { Directory } from './Directory.ts';
import { DirectoryListing } from './DirectoryListing.ts';
import DirPlugin from './DirPlugin.ts';
import { DirProvider } from './DirProvider.ts';

/** A directory that always fails, so the CLI tests can see a failed `dir`. */
const broken: Directory = {
  path: () => '/nowhere',
  entries: () => {
    throw new Error('ENOENT');
  },
};

test('dir works before init, because it needs no document', () => {
  const harness = new PluginHarness([new DirPlugin()]);
  expect(harness.run('dir')).toContain('[FILE] package.json');
});

test('dir, when it works and when it fails, leaves the document and the history alone', () => {
  const failing = {
    activate: (context: PluginContext) =>
      context.addCommand(new DirProvider(new DirectoryListing(broken))),
  };
  const harness = new PluginHarness([failing]);
  harness.run('init');
  harness.run('create rect r 0 0 1 1');
  expect(() => harness.run('dir')).toThrow('cannot read directory: /nowhere');
  expect(harness.run('undo')).toEqual(['rect#r removed']);
  expect(harness.run('redo')).toEqual(['rect#r created']);
  expect(harness.workspace.ids()).toEqual(['r']);
});

test('a dir that works is no io command, so undo still reaches the edit before it', () => {
  const harness = new PluginHarness([new DirPlugin()]);
  harness.run('init');
  harness.run('create rect r 0 0 1 1');
  const cwd = process.cwd();
  harness.run('dir');
  expect(process.cwd()).toBe(cwd);
  expect(harness.run('undo')).toEqual(['rect#r removed']);
});

test('help lists dir when the plugin is loaded, and without it dir is an unknown command', () => {
  expect(new PluginHarness([new DirPlugin()]).run('help').join('\n')).toContain('  dir ');
  const harness = new PluginHarness([]);
  expect(harness.run('help').join('\n')).not.toContain('  dir ');
  expect(() => harness.run('dir')).toThrow('unknown command: dir');
});
