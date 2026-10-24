import { expect, test } from 'bun:test';

import { GroupCommand } from '#command/GroupCommand.ts';
import { HelpCommand } from '#command/HelpCommand.ts';
import { ShowCommand } from '#command/ShowCommand.ts';
import { TreeCommand } from '#command/TreeCommand.ts';
import { Session } from '#test/support/Session.ts';

/** The spec's section 6 document right after `group markers c1 box`. */
function grouped(): Session {
  const session = Session.spec();
  session.run(new GroupCommand(session.workspace, 'markers', ['c1', 'box']));
  return session;
}

test('tree prints spec 5.1 character for character', () => {
  const session = grouped();
  expect(session.run(new TreeCommand(session.workspace))).toEqual([
    'svg (800x600)',
    '├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff',
    '├── text#title     (20,40) "My Diagram"',
    '└── g#markers',
    '    ├── circle#c1  cx=100 cy=100 r=20 fill=red',
    '    └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
  ]);
});

test('tree draws a vertical line past a group that has later siblings', () => {
  const session = grouped();
  session.create('g', 'side');
  expect(session.run(new TreeCommand(session.workspace))).toEqual([
    'svg (800x600)',
    '├── rect#bg        x=0 y=0 w=800 h=600 fill=#ffffff',
    '├── text#title     (20,40) "My Diagram"',
    '├── g#markers',
    '│   ├── circle#c1  cx=100 cy=100 r=20 fill=red',
    '│   └── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
    '└── g#side',
  ]);
});

test('tree <id> prints that subtree; a leaf is a single line', () => {
  const session = grouped();
  expect(session.run(new TreeCommand(session.workspace, 'markers'))).toEqual([
    'g#markers',
    '├── circle#c1  cx=100 cy=100 r=20 fill=red',
    '└── rect#box   x=200 y=80 w=60 h=60 fill=#3366ff',
  ]);
  expect(session.run(new TreeCommand(session.workspace, 'c1'))).toEqual([
    'circle#c1 cx=100 cy=100 r=20 fill=red',
  ]);
});

test('show prints spec 5.2 character for character; a group lists its children', () => {
  const session = grouped();
  expect(session.run(new ShowCommand(session.workspace, 'c1'))).toEqual([
    'circle#c1  parent=g#markers',
    '  cx=100 cy=100 r=20',
    '  fill=red',
  ]);
  expect(session.run(new ShowCommand(session.workspace, 'markers'))).toEqual([
    'g#markers  parent=svg',
    '  children: circle#c1, rect#box',
  ]);
});

test('display commands leave the undo history alone', () => {
  const session = grouped();
  session.run(new TreeCommand(session.workspace));
  session.run(new ShowCommand(session.workspace, 'c1'));
  expect(session.run(new HelpCommand(['line 1', 'line 2']))).toEqual(['line 1', 'line 2']);
  expect(session.undo()).toEqual(['g#markers ungrouped']);
});

test('tree and show need a document; help does not', () => {
  const session = new Session();
  expect(() => session.run(new TreeCommand(session.workspace))).toThrow(
    "no document. use 'init' or 'read' first",
  );
  expect(() => session.run(new ShowCommand(session.workspace, 'c1'))).toThrow('no document');
  expect(session.run(new HelpCommand(['help text']))).toEqual(['help text']);
});
