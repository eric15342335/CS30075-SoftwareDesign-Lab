import { expect, test } from 'bun:test';

import { InitCommand } from '#command/InitCommand.ts';
import { ScaleCommand } from '#command/ScaleCommand.ts';
import { SetCommand } from '#command/SetCommand.ts';
import { Decimal } from '#domain/Decimal.ts';
import { ScriptedHandler } from '#test/support/ScriptedHandler.ts';
import { Session } from '#test/support/Session.ts';

/** Writes the value into the text of every text child, then reports one line. */
const allTexts = new ScriptedHandler('all-texts', 'g', 'label', (shape, value, edit) => {
  for (const child of shape.children().filter((inner) => inner.type === 'text')) {
    edit.set(child, 'text', value);
  }
  edit.report(`${shape.label()} label set`, `${shape.label()} label restored`);
});

/** A session with a group g1 that holds two texts, t1 and t2. */
function session(...handlers: ScriptedHandler[]): Session {
  const catalog = Session.catalog();
  for (const handler of handlers) catalog.addHandler(handler);
  const result = new Session(catalog);
  result.run(new InitCommand(result.workspace));
  result.create('g', 'g1');
  result.create('text', 't1', ['0', '0', 'one'], 'g1');
  result.create('text', 't2', ['0', '9', 'two'], 'g1');
  return result;
}

function texts(result: Session): Array<string | undefined> {
  return ['t1', 't2'].map((id) => result.document().find(id).textContent());
}

function set(result: Session, id: string, attr: string, value: string): string[] {
  return result.run(new SetCommand(result.workspace, id, attr, value));
}

test('register: a second handler with a taken name is refused', () => {
  const catalog = Session.catalog();
  catalog.addHandler(allTexts);
  expect(() => catalog.addHandler(allTexts)).toThrow(
    'duplicate registration: attributes/all-texts',
  );
});

test('invoke: one set that writes several shapes is one undo unit, and redo repeats it', () => {
  const s = session(allTexts);
  expect(set(s, 'g1', 'label', 'new')).toEqual(['g#g1 label set']);
  expect(texts(s)).toEqual(['new', 'new']);
  expect(s.undo()).toEqual(['g#g1 label restored']);
  expect(texts(s)).toEqual(['one', 'two']);
  expect(s.redo()).toEqual(['g#g1 label set']);
  expect(texts(s)).toEqual(['new', 'new']);
});

test('invoke: a handler may write the same attribute twice, and undo restores the first value', () => {
  const twice = new ScriptedHandler('twice', 'g', 'label', (shape, value, edit) => {
    const [first] = shape.children();
    if (first === undefined) return;
    edit.set(first, 'text', 'between');
    edit.set(first, 'text', value);
  });
  const s = session(twice);
  set(s, 'g1', 'label', 'last');
  expect(texts(s)).toEqual(['last', 'two']);
  s.undo();
  expect(texts(s)).toEqual(['one', 'two']);
});

test('a handler that throws after a write leaves the document and both stacks as they were', () => {
  const broken = new ScriptedHandler('broken', 'g', 'label', (shape, _value, edit) => {
    for (const [index, child] of shape.children().entries()) {
      edit.set(child, index === 0 ? 'text' : 'x', index === 0 ? 'half' : 'not a number');
    }
  });
  const s = session(broken);
  set(s, 't1', 'text', 'edited');
  s.undo();
  expect(() => set(s, 'g1', 'label', 'x')).toThrow(
    'attribute handler failed: broken (invalid number: not a number)',
  );
  expect(texts(s)).toEqual(['one', 'two']);
  // The redo stack still holds the undone set of t1, and the undo stack still holds the creates.
  expect(s.redo()).toEqual(['text#t1 updated: text="edited"']);
  expect(s.undo()).toEqual(['text#t1 updated: text="one"']);
  expect(s.undo()).toEqual(['text#t2 removed']);
});

test('two responsible handlers are a conflict, and nothing changes', () => {
  const other = new ScriptedHandler('other', 'g', 'label', () => {});
  const s = session(allTexts, other);
  expect(() => set(s, 'g1', 'label', 'x')).toThrow(
    'conflicting attribute handlers for label on g#g1: all-texts, other',
  );
  expect(texts(s)).toEqual(['one', 'two']);
});

test('default: without a responsible handler, the Phase 1 rules apply', () => {
  const s = session(allTexts);
  expect(set(s, 't1', 'fill', 'red')).toEqual(['text#t1 updated: fill="red"']);
  expect(() => set(s, 't1', 'label', 'x')).toThrow('unknown attribute: label');
  expect(s.undo()).toEqual(['text#t1 updated: fill removed']);
});

test('undo of set restores the exact number, not the rounded text', () => {
  const s = session();
  s.create('rect', 'r', ['3', '0', '1', '1']);
  s.run(new ScaleCommand(s.workspace, 'r', Decimal.parse('1e-7')));
  expect(set(s, 'r', 'x', '5')).toEqual(['rect#r updated: x="5"']);
  expect(s.undo()).toEqual(['rect#r updated: x="0"']);
  s.run(new ScaleCommand(s.workspace, 'r', Decimal.parse('1e7')));
  expect(s.document().find('r').attributes()).toContainEqual(['x', '3']);
});

test('create, set, undo twice and redo twice give the same document, and a failed redo keeps both stacks', () => {
  let fail = false;
  const flaky = new ScriptedHandler('flaky', 'g', 'label', (shape, value, edit) => {
    if (fail) throw new Error('not now');
    allTexts.apply(shape, 'label', value, edit);
  });
  const s = session(flaky);
  set(s, 'g1', 'label', 'v');
  s.undo();
  s.undo();
  fail = true;
  s.redo();
  expect(() => s.redo()).toThrow('attribute handler failed: flaky (not now)');
  fail = false;
  expect(s.redo()).toEqual(['g#g1 label set']);
  expect(texts(s)).toEqual(['v', 'v']);
});
