import { afterAll, expect, test } from 'bun:test';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { InitCommand } from '#command/InitCommand.ts';
import { SetCommand } from '#command/SetCommand.ts';
import { Decimal } from '#domain/Decimal.ts';
import { SvgReader } from '#io/SvgReader.ts';
import { SvgWriter } from '#io/SvgWriter.ts';
import { Session } from '#test/support/Session.ts';

const fixtures = join(import.meta.dir, '..', 'fixtures');
const dir = mkdtempSync(join(tmpdir(), 'svg-writer-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

test('writes the spec section 0.1 sample byte for byte', () => {
  const session = new Session();
  session.run(new InitCommand(session.workspace, new Decimal(400), new Decimal(200)));
  session.create('g', 'flow');
  session.create('rect', 'start', ['30', '70', '120', '60', '#4a90d9'], 'flow');
  session.create('line', 'edge', ['150', '100', '250', '100', 'black'], 'flow');
  session.create('rect', 'end', ['250', '70', '120', '60', '#f5a623'], 'flow');
  expect(new SvgWriter().serialize(session.document())).toBe(
    readFileSync(join(fixtures, 'sample.svg'), 'utf8'),
  );
});

test('an empty container and an empty text are self-closing, as in spec 4.1', () => {
  const session = new Session();
  session.run(new InitCommand(session.workspace));
  session.create('g', 'scene');
  session.create('text', 'note', ['1', '2', '']);
  const text = new SvgWriter().serialize(session.document());
  expect(text).toContain('\n  <g id="scene"/>\n');
  expect(text).toContain('\n  <text id="note" x="1" y="2"/>\n');
});

test('markup characters are escaped and read back unchanged', () => {
  const session = Session.spec();
  session.run(new SetCommand(session.workspace, 'title', 'text', 'a < b & "c"'));
  session.run(new SetCommand(session.workspace, 'bg', 'fill', 'url("#g")'));
  const text = new SvgWriter().serialize(session.document());
  expect(text).toContain('fill="url(&quot;#g&quot;)"');
  expect(text).toContain('>a &lt; b &amp; &quot;c&quot;</text>');
  const reread = new SvgReader().parse(text);
  expect(reread.find('title').textContent()).toBe('a < b & "c"');
  expect(new SvgWriter().serialize(reread)).toBe(text);
});

test('write puts the text in the file, or says it cannot', () => {
  const document = Session.spec().document();
  const writer = new SvgWriter();
  const file = join(dir, 'out.svg');
  writer.write(file, document);
  expect(readFileSync(file, 'utf8')).toBe(writer.serialize(document));
  const unwritable = join(dir, 'no-such-dir', 'out.svg');
  expect(() => writer.write(unwritable, document)).toThrow(`cannot write file: ${unwritable}`);
});
