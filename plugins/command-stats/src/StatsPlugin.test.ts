import { expect, test } from 'bun:test';

import { PluginHarness } from '@svgframe/testing';

import StatsPlugin from './StatsPlugin.ts';

/** Returns a CLI with the stats plugin and runs the lines in it. */
function run(...lines: string[]): string[][] {
  const harness = new PluginHarness([new StatsPlugin()]);
  return lines.map((line) => harness.run(line));
}

test('stats counts leaves by type in first-seen order, depth first, and counts containers apart', () => {
  const results = run(
    'init',
    'create g outer',
    'create text t1 1 1 "a" in outer',
    'create rect r1 0 0 1 1 in outer',
    'create g inner in outer',
    'create circle c1 1 1 1 in inner',
    'create rect r2 0 0 1 1 in inner',
    'create rect r3 0 0 1 1',
    'create text t2 1 1 "b"',
    'stats',
  );
  expect(results.at(-1)).toEqual(['text: 2  rect: 3  circle: 1  (total 6, containers 2)']);
});

test('stats follows the current order after front and back', () => {
  const results = run('init', 'create rect r 0 0 1 1', 'create circle c 1 1 1', 'back c', 'stats');
  expect(results.at(-1)).toEqual(['circle: 1  rect: 1  (total 2, containers 0)']);
});

test('stats on an empty canvas prints only the totals', () => {
  expect(run('init', 'stats').at(-1)).toEqual(['(total 0, containers 0)']);
});

test('stats stays out of the history, so undo reverts the edit before it', () => {
  const results = run('init', 'create rect r 0 0 1 1', 'stats', 'undo', 'stats');
  expect(results.slice(2)).toEqual([
    ['rect: 1  (total 1, containers 0)'],
    ['rect#r removed'],
    ['(total 0, containers 0)'],
  ]);
});

test('help lists stats when the plugin is loaded, and without it stats is an unknown command', () => {
  expect(run('help')[0]).toContain('  stats                           count the shapes by type');
  const harness = new PluginHarness([]);
  expect(harness.run('help').join('\n')).not.toContain('stats');
  expect(() => harness.run('stats')).toThrow('unknown command: stats');
});
