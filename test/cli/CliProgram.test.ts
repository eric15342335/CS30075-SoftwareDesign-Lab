import { expect, test } from 'bun:test';

import { CliProgram } from '#cli/CliProgram.ts';
import { EditorError } from '#domain/EditorError.ts';
import { EchoProvider } from '#test/support/EchoProvider.ts';
import { Session } from '#test/support/Session.ts';
import { TempFolder } from '#test/support/TempFolder.ts';

/** Returns a new program that has already run the given setup lines. */
function cli(...lines: string[]): CliProgram {
  const program = new CliProgram(...Session.program());
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

test('canvas, save and read reach their commands, and a quoted path may contain spaces', () => {
  using folder = new TempFolder();
  const file = folder.file('my drawing.svg');
  const program = cli('init', 'create rect r1 0 0 10 10');
  expect(program.run('canvas')).toEqual(['canvas 800x600']);
  expect(program.run('canvas 400 300')).toEqual(['canvas resized to 400x300']);
  expect(program.run(`save "${file}"`)).toEqual([`saved to ${file} (1 element)`]);
  expect(cli().run(`read "${file}"`)).toEqual([`read ${file} (1 element)`]);
});

test('quoted words keep their spaces, and a blank line does nothing', () => {
  const program = cli('init');
  expect(program.run('create text title 20 40 "My Diagram"')).toEqual(['text#title created']);
  expect(program.run('tree title')).toEqual(['text#title (20,40) "My Diagram"']);
  expect(program.run('   ')).toEqual([]);
});

test('negative numbers and text that starts with a dash are arguments, not options', () => {
  const program = cli('init', 'create circle c1 100 100 20');
  expect(program.run('move c1 -30 -0.5')).toEqual(['circle#c1 moved to (70,99.5)']);
  expect(program.run('create text t 0 0 -hi')).toEqual(['text#t created']);
  expect(program.run('tree t')).toEqual(['text#t (0,0) "-hi"']);
});

test('a trailing "in <id>" names the container, and "in" anywhere else is a plain word', () => {
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

test('a syntax error becomes a one-line EditorError without the commander prefix', () => {
  const program = cli('init');
  expect(() => program.run('mvoe c1 1 2')).toThrow(EditorError);
  expect(() => program.run('mvoe c1 1 2')).toThrow(new EditorError('unknown command: mvoe'));
  expect(() => program.run('move c1 1')).toThrow("missing required argument 'dy'");
  expect(() => program.run('delete a b')).toThrow("too many arguments for 'delete'");
  expect(() => program.run('move c1 1 x')).toThrow('invalid number: x');
  expect(() => program.run('--help')).toThrow('unknown command: --help');
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

test('an empty quoted word is a value, so "" sets an empty text', () => {
  const program = cli('init', 'create text t 1 2 old');
  expect(program.run('set t text ""')).toEqual(['text#t updated: text=""']);
});

test('register: a second command provider with a taken name is refused', () => {
  const extensions = Session.extensions();
  expect(() => extensions.commands.add(new EchoProvider('move'))).toThrow(
    'duplicate registration: commands/move',
  );
});

test('invoke: a registered provider gets the raw words and appears in help', () => {
  const [workspace, executor, extensions] = Session.program();
  extensions.commands.add(new EchoProvider('echo'));
  const program = new CliProgram(workspace, executor, extensions);
  expect(program.run('echo -5 "two words" x')).toEqual(['-5|two words|x']);
  expect(program.run('help')).toContain('  echo <first> [rest...]          repeat the words');
  expect(program.complete('ec')).toEqual([['echo'], 'ec']);
});

test('default: a name that no provider registered is an unknown command', () => {
  expect(() => cli().run('stats')).toThrow(new EditorError('unknown command: stats'));
});
