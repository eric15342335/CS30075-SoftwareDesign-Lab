import { afterAll, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { PluginHarness } from '@svgframe/testing';

import BoxPlugin from './BoxPlugin.ts';

const folder = fs.mkdtempSync(join(tmpdir(), 'svg-box-'));
afterAll(() => fs.rmSync(folder, { recursive: true, force: true }));

/** Returns a CLI with the box plugin. */
function harness(options: Readonly<Record<string, unknown>> = {}): PluginHarness {
  return new PluginHarness([new BoxPlugin()], options);
}

/** Runs the lines in a new CLI with the box plugin and returns the feedback of each line. */
function run(...lines: string[]): string[][] {
  const cli = harness();
  return lines.map((line) => cli.run(line));
}

test('create box reports the three elements and tree shows the spec layout with (box)', () => {
  const results = run('init', 'create box n1 120 100 160 60 "开始"', 'tree n1');
  expect(results[1]).toEqual(['box#n1 created (g#n1 + rect#n1-rect + text#n1-label)']);
  expect(results[2]).toEqual([
    'g#n1 (box)',
    '├── rect#n1-rect   x=120 y=100 w=160 h=60 fill=#4a90d9',
    '└── text#n1-label  (140,135) "开始"',
  ]);
});

test('the fill option sets the rect color of new boxes', () => {
  const cli = harness({ fill: '#eee' });
  cli.run('init');
  cli.run('create box n1 0 0 80 40 "a"');
  expect(cli.run('tree n1')[1]).toContain('fill=#eee');
});

/** Returns a CLI with the box plugin after it ran the lines. */
function after(...lines: string[]): PluginHarness {
  const cli = harness();
  for (const line of lines) cli.run(line);
  return cli;
}

test('create box with a wrong number of arguments fails with the usage', () => {
  expect(() => after('init').run('create box n1 1 2 3 4')).toThrow(
    'usage: create box <id> <x> <y> <width> <height> <label> [in <containerId>]',
  );
});

test('create box with a bad number fails and leaves nothing behind', () => {
  const cli = after('init');
  expect(() => cli.run('create box n1 1 x 3 4 "a"')).toThrow('invalid number: x');
  expect(cli.run('tree')).toEqual(['svg (800x600)']);
});

test('create box fails as a whole when a part id is already taken', () => {
  const cli = after('init', 'create rect n1-label 0 0 1 1');
  expect(() => cli.run('create box n1 0 0 8 4 "a"')).toThrow('id already exists: n1-label');
  expect(cli.run('tree')).toEqual(['svg (800x600)', '└── rect#n1-label  x=0 y=0 w=1 h=1']);
});

test('a box nests in a box with the in clause and moves as a whole', () => {
  const results = run(
    'init',
    'create box n1 0 0 80 40 "a"',
    'create box n2 10 10 8 8 "b" in n1',
    'move n1 1 1',
    'tree n1',
  );
  expect(results[2]).toEqual(['box#n2 created in box#n1 (g#n2 + rect#n2-rect + text#n2-label)']);
  expect(results[4]).toEqual([
    'g#n1 (box)',
    '├── rect#n1-rect       x=1 y=1 w=80 h=40 fill=#4a90d9',
    '├── text#n1-label      (11,26) "a"',
    '└── g#n2 (box)',
    '    ├── rect#n2-rect   x=11 y=11 w=8 h=8 fill=#4a90d9',
    '    └── text#n2-label  (12,20) "b"',
  ]);
});

test('set fill propagates to the rect part, and undo restores it', () => {
  const results = run('init', 'create box n2 0 0 8 4 "a"', 'set n2 fill #f5a623', 'tree n2');
  expect(results[2]).toEqual(['box#n2 fill propagated to n2-rect']);
  expect(results[3]?.[1]).toContain('fill=#f5a623');
  const cli = harness();
  for (const line of ['init', 'create box n2 0 0 8 4 "a"', 'set n2 fill red']) cli.run(line);
  expect(cli.run('undo')).toEqual(['box#n2 fill restored on n2-rect']);
  expect(cli.run('tree n2')[1]).toContain('fill=#4a90d9');
});

test('set label rewrites the text part, and undo prints the old label', () => {
  const results = run(
    'init',
    'create box n2 0 0 8 4 "处理数据"',
    'set n2 label "处理数据 v2"',
    'undo',
    'tree n2',
  );
  expect(results[2]).toEqual(['box#n2 label updated: "处理数据 v2"']);
  expect(results[3]).toEqual(['box#n2 label restored: "处理数据"']);
  expect(results[4]?.[2]).toContain('"处理数据"');
});

test('set label on a plain rect is still an unknown attribute', () => {
  const cli = after('init', 'create rect r 0 0 1 1');
  expect(() => cli.run('set r label x')).toThrow('unknown attribute: label');
});

test('ungroup refuses a box, and delete removes it with one undo', () => {
  const cli = after('init', 'create box n1 0 0 8 4 "a"');
  expect(() => cli.run('ungroup n1')).toThrow('cannot ungroup composite shape: n1');
  cli.run('delete n1');
  expect(cli.run('tree')).toEqual(['svg (800x600)']);
  cli.run('undo');
  expect(cli.run('tree')).toHaveLength(4);
});

test('the parts of a box cannot be deleted or moved out', () => {
  const cli = after('init', 'create box n1 0 0 8 4 "a"', 'create g other');
  const refusal = 'cannot remove a part of a composite shape';
  expect(() => cli.run('delete n1-rect')).toThrow(`${refusal}: n1-rect`);
  expect(() => cli.run('addto other n1-label')).toThrow(`${refusal}: n1-label`);
  expect(() => cli.run('group pair n1-rect other')).toThrow(`${refusal}: n1-rect`);
  expect(cli.run('tree n1')).toHaveLength(3);
});

test('a box survives save and read with data-kind and the (box) label', () => {
  const file = join(folder, 'box.svg');
  const cli = harness();
  for (const line of ['init', 'create box n1 120 100 160 60 "开始"', `save ${file}`]) cli.run(line);
  expect(fs.readFileSync(file, 'utf8')).toContain('data-kind="box"');
  const other = harness();
  other.run(`read ${file}`);
  expect(other.run('tree')).toEqual([
    'svg (800x600)',
    '└── g#n1 (box)',
    '    ├── rect#n1-rect   x=120 y=100 w=160 h=60 fill=#4a90d9',
    '    └── text#n1-label  (140,135) "开始"',
  ]);
  expect(other.run('set n1 label b')).toEqual(['box#n1 label updated: "b"']);
});

test('read rejects a box without its parts and keeps the document', () => {
  const file = join(folder, 'broken.svg');
  fs.writeFileSync(
    file,
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="60">' +
      '<g id="n1" data-kind="box"><rect id="n1-rect" x="0" y="0" width="1" height="1"/></g></svg>',
  );
  const cli = after('init', 'create rect keep 0 0 1 1');
  expect(() => cli.run(`read ${file}`)).toThrow(
    'box n1 needs exactly the parts rect#n1-rect and text#n1-label',
  );
  expect(cli.run('tree')).toEqual(['svg (800x600)', '└── rect#keep  x=0 y=0 w=1 h=1']);
});

test('the type label marks only boxes', () => {
  const results = run('init', 'create g plain', 'create box b 0 0 8 4 "a"', 'tree');
  expect(results[3]).toContain('├── g#plain');
  expect(results[3]).toContain('└── g#b (box)');
});
