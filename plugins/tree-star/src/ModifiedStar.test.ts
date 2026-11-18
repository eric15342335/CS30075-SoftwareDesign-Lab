import { expect, test } from 'bun:test';

import { PluginHarness, TempFolder } from '@svgframe/testing';

import ModifiedStarPlugin from './ModifiedStarPlugin.ts';

/** Returns a CLI with the modified-star plugin after it ran the lines. */
function after(...lines: string[]): PluginHarness {
  const cli = new PluginHarness([new ModifiedStarPlugin()]);
  for (const line of lines) cli.run(line);
  return cli;
}

/** Returns the rows of `tree` that end with a star. */
function starred(cli: PluginHarness): string[] {
  return cli.run('tree').filter((row) => row.endsWith(' *'));
}

test('a new document has no stars, and a new shape gets one at once with the canvas row', () => {
  const cli = after('init');
  expect(starred(cli)).toEqual([]);
  cli.run('create rect r 0 0 1 1');
  expect(cli.run('tree')).toEqual(['svg (800x600) *', '└── rect#r  x=0 y=0 w=1 h=1 *']);
});

test('save clears the stars, an edit marks only its row, and undo of that edit clears it', () => {
  using folder = new TempFolder();
  const file = folder.file('saved.svg');
  const cli = after('init', 'create rect r 0 0 1 1', 'create g g1', `save "${file}"`);
  expect(starred(cli)).toEqual([]);
  cli.run('move r 1 1');
  expect(starred(cli)).toEqual(['├── rect#r  x=1 y=1 w=1 h=1 *']);
  cli.run('undo');
  expect(starred(cli)).toEqual([]);
});

test('read starts clean, and an edit inside a group marks the shape but not its parents', () => {
  using folder = new TempFolder();
  const file = folder.file('saved.svg');
  after('init', 'create g g1', 'create rect r 0 0 1 1 in g1', `save "${file}"`);
  // This CLI has its own edits and has never saved, so only the read can clear its stars.
  const cli = after('init', 'create circle c 1 1 1');
  cli.run(`read "${file}"`);
  expect(cli.run('tree')).toEqual(['svg (800x600)', '└── g#g1', '    └── rect#r  x=0 y=0 w=1 h=1']);
  cli.run('set r fill red');
  expect(starred(cli)).toEqual(['    └── rect#r  x=0 y=0 w=1 h=1 fill=red *']);
});

test('canvas resize and delete mark only the canvas row', () => {
  using folder = new TempFolder();
  const file = folder.file('saved.svg');
  const cli = after('init', 'create rect r 0 0 1 1', 'create rect s 0 0 1 1', `save "${file}"`);
  cli.run('canvas 900');
  expect(starred(cli)).toEqual(['svg (900x600) *']);
  cli.run('canvas 800');
  expect(starred(cli)).toEqual([]);
  cli.run('delete s');
  expect(starred(cli)).toEqual(['svg (800x600) *']);
});

test('a reorder marks the canvas row, and moving into a group marks the moved shape', () => {
  using folder = new TempFolder();
  const file = folder.file('saved.svg');
  const cli = after('init', 'create rect r 0 0 1 1', 'create g g1', `save "${file}"`);
  cli.run('front r');
  expect(starred(cli)).toEqual(['svg (800x600) *']);
  cli.run('undo');
  cli.run('addto g1 r');
  expect(starred(cli)).toEqual(['svg (800x600) *', '    └── rect#r  x=0 y=0 w=1 h=1 *']);
});

test('a set to the same value leaves no star, and redo brings the star back', () => {
  using folder = new TempFolder();
  const file = folder.file('saved.svg');
  const cli = after('init', 'create rect r 0 0 1 1 red', `save "${file}"`, 'set r fill red');
  expect(starred(cli)).toEqual([]);
  cli.run('set r fill blue');
  cli.run('undo');
  expect(starred(cli)).toEqual([]);
  cli.run('redo');
  expect(starred(cli)).toEqual(['└── rect#r  x=0 y=0 w=1 h=1 fill=blue *']);
});

test('a failed save and a failed read keep the stars', () => {
  using folder = new TempFolder();
  const cli = after('init', 'create rect r 0 0 1 1');
  const stars = ['svg (800x600) *', '└── rect#r  x=0 y=0 w=1 h=1 *'];
  const unwritable = folder.file('missing', 'x.svg');
  expect(() => cli.run(`save "${unwritable}"`)).toThrow(`cannot write file: ${unwritable}`);
  expect(starred(cli)).toEqual(stars);
  const missing = folder.file('missing.svg');
  expect(() => cli.run(`read "${missing}"`)).toThrow(`cannot read file: ${missing}`);
  expect(starred(cli)).toEqual(stars);
});

test('two plugin instances keep their own saved state', () => {
  using folder = new TempFolder();
  const file = folder.file('saved.svg');
  const first = after('init', 'create rect r 0 0 1 1', `save "${file}"`);
  const second = after('init', 'create rect r 0 0 1 1');
  expect(starred(first)).toEqual([]);
  expect(starred(second)).toHaveLength(2);
});

test('a move into the group just before marks the canvas row, although the order stays', () => {
  using folder = new TempFolder();
  const file = folder.file('saved.svg');
  const cli = after('init', 'create g g1', 'create rect r 0 0 1 1', `save "${file}"`, 'addto g1 r');
  expect(starred(cli)).toEqual(['svg (800x600) *', '    └── rect#r  x=0 y=0 w=1 h=1 *']);
});

test('tree of one shape marks a changed root row and leaves an unchanged one alone', () => {
  using folder = new TempFolder();
  const file = folder.file('saved.svg');
  const cli = after('init', 'create g g1', `save "${file}"`, 'create rect r 0 0 1 1 in g1');
  expect(cli.run('tree g1')).toEqual(['g#g1', '└── rect#r  x=0 y=0 w=1 h=1 *']);
  cli.run('set g1 fill red');
  expect(cli.run('tree g1')[0]).toBe('g#g1 fill=red *');
});
