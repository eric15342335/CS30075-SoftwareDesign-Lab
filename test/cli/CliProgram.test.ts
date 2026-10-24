import { expect, test } from 'bun:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CliProgram } from '#cli/CliProgram.ts';
import { CommandExecutor } from '#command/CommandExecutor.ts';
import { Workspace } from '#command/Workspace.ts';
import { EditorError } from '#domain/EditorError.ts';

/** A fresh program after running the given setup lines. */
function cli(...lines: string[]): CliProgram {
  const program = new CliProgram(new Workspace(), new CommandExecutor());
  for (const line of lines) program.run(line);
  return program;
}

test('every verb reaches its command', () => {
  const program = cli('init 400 300', 'create rect r1 0 0 10 10', 'create circle c1 5 5 2');
  const lines = [
    'scale r1 2',
    'set r1 fill red',
    'move r1 1 1',
    'create g g1',
    'group g2 r1 c1',
    'create g g3 in g2',
    'addto g3 c1',
    'ungroup g3',
    'front r1',
    'back r1',
    'delete g1',
    'undo',
    'redo',
    'tree g2',
    'show r1',
  ];
  expect(lines.map((line) => program.run(line))).toEqual([
    ['rect#r1 scaled by 2'],
    ['rect#r1 updated: fill="red"'],
    ['rect#r1 moved to (1,1)'],
    ['g#g1 created'],
    ['g#g2 created with 2 children'],
    ['g#g3 created in g#g2'],
    ['circle#c1 moved into g#g3'],
    ['g#g3 ungrouped'],
    ['rect#r1 brought to front'],
    ['rect#r1 sent to back'],
    ['g#g1 deleted'],
    ['g#g1 restored into svg'],
    ['g#g1 deleted'],
    ['g#g2', '├── rect#r1    x=1 y=1 w=20 h=20 fill=red', '└── circle#c1  cx=5 cy=5 r=2'],
    ['rect#r1  parent=g#g2', '  x=1 y=1 width=20 height=20', '  fill=red'],
  ]);
});

test('canvas, save and read reach their commands; a quoted path may contain spaces', () => {
  const dir = mkdtempSync(join(tmpdir(), 'svg-cli-'));
  const file = join(dir, 'my drawing.svg');
  try {
    const program = cli('init', 'create rect r1 0 0 10 10');
    expect(program.run('canvas')).toEqual(['canvas 800x600']);
    expect(program.run('canvas 400 300')).toEqual(['canvas resized to 400x300']);
    expect(program.run(`save "${file}"`)).toEqual([`saved to ${file} (1 element)`]);
    expect(cli().run(`read "${file}"`)).toEqual([`read ${file} (1 element)`]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('quoted words keep their spaces; a blank line does nothing', () => {
  const program = cli('init');
  expect(program.run('create text title 20 40 "My Diagram"')).toEqual(['text#title created']);
  expect(program.run('tree title')).toEqual(['text#title (20,40) "My Diagram"']);
  expect(program.run('   ')).toEqual([]);
});

test('negative numbers and dash-prefixed text are arguments, not options', () => {
  const program = cli('init', 'create circle c1 100 100 20');
  expect(program.run('move c1 -30 -0.5')).toEqual(['circle#c1 moved to (70,99.5)']);
  expect(program.run('create text t 0 0 -hi')).toEqual(['text#t created']);
  expect(program.run('tree t')).toEqual(['text#t (0,0) "-hi"']);
});

test('a trailing "in <id>" names the container; "in" elsewhere is a plain word', () => {
  const program = cli('init', 'create g node1');
  expect(program.run('create rect start 120 100 160 60 #4a90d9 in node1')).toEqual([
    'rect#start created in g#node1',
  ]);
  expect(program.run('create text a 1 2 in')).toEqual(['text#a created']);
  expect(program.run('create text b 1 2 "in" in node1')).toEqual(['text#b created in g#node1']);
  expect(program.run('tree node1')).toEqual([
    'g#node1',
    '├── rect#start  x=120 y=100 w=160 h=60 fill=#4a90d9',
    '└── text#b      (1,2) "in"',
  ]);
});

test('syntax errors are one-line EditorErrors without commander prefix', () => {
  const program = cli('init');
  expect(() => program.run('mvoe c1 1 2')).toThrow(EditorError);
  expect(() => program.run('mvoe c1 1 2')).toThrow(
    new EditorError("unknown command 'mvoe' (Did you mean move?)"),
  );
  expect(() => program.run('move c1 1')).toThrow("missing required argument 'dy'");
  expect(() => program.run('delete a b')).toThrow("too many arguments for 'delete'");
  expect(() => program.run('move c1 1 x')).toThrow('invalid number: x');
  expect(() => program.run('--help')).toThrow("unknown option '--help'");
});

test('help lists every command and the create syntax of every shape type', () => {
  expect(cli().run('help')).toEqual([
    'Usage: <command> [arguments]',
    '',
    'Commands:',
    '  init [w] [h]                    new empty canvas, 800x600 by default',
    '  read <file>                     open an .svg file as the document',
    '  save [file]                     save to a file (default: last read or saved)',
    '  canvas [w] [h]                  show the canvas size, or change it',
    '  create <type> <id> [params...]  new shape, see shape types below',
    '  delete <id>                     delete a shape and everything inside it',
    '  move <id> <dx> <dy>             move by an offset',
    '  scale <id> <factor>             multiply position and size by factor > 0',
    '  set <id> <attr> <value>         set a style or geometry attribute, or text',
    '  group <gid> <ids...>            put shapes into a new container',
    '  ungroup <gid>                   dissolve a container into its parent',
    '  addto <gid> <id>                move a shape to the end of a container',
    '  front <id>                      paint above its siblings',
    '  back <id>                       paint below its siblings',
    '  tree [id]                       structure tree of the document or one shape',
    '  show <id>                       all attributes of one shape',
    '  help                            show this list',
    '  undo                            undo the last edit',
    '  redo                            redo the last undone edit',
    '',
    'Shape types:',
    '  create rect <id> <x> <y> <width> <height> [fill] [in <containerId>]',
    '  create circle <id> <cx> <cy> <r> [fill] [in <containerId>]',
    '  create ellipse <id> <cx> <cy> <rx> <ry> [fill] [in <containerId>]',
    '  create line <id> <x1> <y1> <x2> <y2> [stroke] [in <containerId>]',
    '  create text <id> <x> <y> <text> [in <containerId>]',
    '  create g <id> [in <containerId>]',
    '',
    'Quote text that has spaces: "My Diagram". Lines starting with # are comments.',
    'Ctrl+C or Ctrl+D quits.',
  ]);
});

test('completion offers command names first, then the ids in the document', () => {
  const program = cli('init', 'create rect box 0 0 1 1', 'create g base');
  expect(program.complete('un')).toEqual([['ungroup', 'undo'], 'un']);
  expect(program.complete('move b')).toEqual([['box', 'base'], 'b']);
  expect(cli().complete('show ')).toEqual([[], '']);
});
