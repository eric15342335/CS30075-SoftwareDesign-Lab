import { afterAll, expect, test } from 'bun:test';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { CanvasCommand } from '#command/CanvasCommand.ts';
import { InitCommand } from '#command/InitCommand.ts';
import { ReadCommand } from '#command/ReadCommand.ts';
import { ResizeCommand } from '#command/ResizeCommand.ts';
import { SaveCommand } from '#command/SaveCommand.ts';
import { Decimal } from '#domain/Decimal.ts';
import { Session } from '#test/support/Session.ts';

const fixtures = join(import.meta.dir, '..', 'fixtures');
const dir = mkdtempSync(join(tmpdir(), 'svg-commands-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test('save then read: feedback with counts, and save without a name reuses the file', () => {
  const session = Session.spec();
  const file = join(dir, 'demo.svg');
  expect(session.run(new SaveCommand(session.workspace, file))).toEqual([
    `saved to ${file} (4 elements)`,
  ]);
  session.create('circle', 'dot', ['1', '1', '1']);
  expect(session.run(new SaveCommand(session.workspace))).toEqual([
    `saved to ${file} (5 elements)`,
  ]);
  const copy = new Session();
  expect(copy.run(new ReadCommand(copy.workspace, file))).toEqual([`read ${file} (5 elements)`]);
  expect(copy.fingerprint()).toEqual(session.fingerprint());
});

test('read prints warnings first, and a later save writes back to the file read', () => {
  const file = join(dir, 'other.svg');
  copyFileSync(join(fixtures, 'other.svg'), file);
  const session = new Session();
  expect(session.run(new ReadCommand(session.workspace, file))).toEqual([
    'warning: assigned id rect1 to unnamed <rect>',
    `read ${file} (7 elements)`,
  ]);
  expect(session.run(new SaveCommand(session.workspace))).toEqual([
    `saved to ${file} (7 elements)`,
  ]);
  expect(readFileSync(file, 'utf8')).toContain('<rect id="rect1" ');
});

test('a document with one element says "1 element"', () => {
  const session = new Session();
  session.run(new InitCommand(session.workspace));
  session.create('g', 'only');
  const file = join(dir, 'one.svg');
  expect(session.run(new SaveCommand(session.workspace, file))).toEqual([
    `saved to ${file} (1 element)`,
  ]);
  expect(session.run(new ReadCommand(session.workspace, file))).toEqual([
    `read ${file} (1 element)`,
  ]);
});

test('save needs a file name after init, also when an earlier document was read', () => {
  const session = new Session();
  expect(() => session.run(new SaveCommand(session.workspace))).toThrow('no document');
  session.run(new InitCommand(session.workspace));
  expect(() => session.run(new SaveCommand(session.workspace))).toThrow(
    "no file name. use 'save <file.svg>'",
  );
  session.run(new ReadCommand(session.workspace, join(fixtures, 'other.svg')));
  session.run(new InitCommand(session.workspace));
  expect(() => session.run(new SaveCommand(session.workspace))).toThrow('no file name');
});

test('a failed read or save changes nothing, history included', () => {
  const session = Session.spec();
  const before = session.fingerprint();
  const missing = join(dir, 'missing.svg');
  expect(() => session.run(new ReadCommand(session.workspace, missing))).toThrow(
    `cannot read file: ${missing}`,
  );
  const unwritable = join(dir, 'no-such-dir', 'x.svg');
  expect(() => session.run(new SaveCommand(session.workspace, unwritable))).toThrow(
    `cannot write file: ${unwritable}`,
  );
  expect(session.fingerprint()).toEqual(before);
  expect(session.undo()).toEqual(['rect#box removed']);
});

test('canvas shows the size and leaves history alone', () => {
  const session = Session.spec();
  expect(session.run(new CanvasCommand(session.workspace))).toEqual(['canvas 800x600']);
  expect(session.undo()).toEqual(['rect#box removed']);
  const empty = new Session();
  expect(() => empty.run(new CanvasCommand(empty.workspace))).toThrow('no document');
});

test('canvas resize: a missing height stays, sizes must be positive, and undo stops', () => {
  const session = Session.spec();
  expect(session.run(new ResizeCommand(session.workspace, new Decimal(1024)))).toEqual([
    'canvas resized to 1024x600',
  ]);
  expect(
    session.run(new ResizeCommand(session.workspace, new Decimal(400), new Decimal(300))),
  ).toEqual(['canvas resized to 400x300']);
  expect(() => session.run(new ResizeCommand(session.workspace, new Decimal(0)))).toThrow(
    'canvas size must be positive',
  );
  expect(() => session.undo()).toThrow('undo not allowed after io command');
  expect(() => session.redo()).toThrow('undo not allowed after io command');
});
