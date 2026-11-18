import { expect, test } from 'bun:test';

import { CliProgram } from '#cli/CliProgram.ts';
import { TreeRenderer } from '#command/TreeRenderer.ts';
import { FixedDecorator } from '#test/support/FixedDecorator.ts';
import { Session } from '#test/support/Session.ts';

const star = new FixedDecorator('star', (shape) => (shape.type === 'rect' ? '*' : undefined));
const kind = new FixedDecorator('kind', (shape) => `(${shape.type})`);

function render(...decorators: FixedDecorator[]): (id?: string) => string[] {
  const session = Session.spec();
  return (id) => new TreeRenderer(decorators).render(session.document(), id);
}

test('register: a second decorator with a taken name is refused', () => {
  const extensions = Session.extensions();
  extensions.decorators.add(star);
  expect(() => extensions.decorators.add(star)).toThrow('duplicate registration: decorators/star');
});

test('invoke: labels follow the row in registration order, and the column does not move', () => {
  expect(render(star, kind)()).toEqual([
    'svg (800x600) (svg)',
    '├── rect#bg     x=0 y=0 w=800 h=600 fill=#ffffff * (rect)',
    '├── text#title  (20,40) "My Diagram" (text)',
    '├── circle#c1   cx=100 cy=100 r=20 fill=red (circle)',
    '└── rect#box    x=200 y=80 w=60 h=60 fill=#3366ff * (rect)',
  ]);
});

test('invoke: the root row of tree <id> gets its labels too', () => {
  expect(render(kind, star)('box')).toEqual([
    'rect#box x=200 y=80 w=60 h=60 fill=#3366ff (rect) *',
  ]);
});

test('default: without decorators, tree through the CLI prints the Phase 1 rows', () => {
  const program = new CliProgram(...Session.program());
  program.run('init');
  program.run('create rect r 1 2 3 4');
  expect(program.run('tree')).toEqual(['svg (800x600)', '└── rect#r  x=1 y=2 w=3 h=4']);
});

test('invoke: the CLI passes the registered decorators to tree', () => {
  const [workspace, executor, extensions] = Session.program();
  extensions.decorators.add(star);
  const program = new CliProgram(workspace, executor, extensions);
  program.run('init');
  program.run('create rect r 1 2 3 4');
  expect(program.run('tree')).toEqual(['svg (800x600)', '└── rect#r  x=1 y=2 w=3 h=4 *']);
});

test('a decorator that throws makes tree fail with its name and reason', () => {
  const broken = new FixedDecorator('broken', () => {
    throw new Error('no label today');
  });
  expect(() => render(star, broken)()).toThrow('tree decorator failed: broken (no label today)');
});
