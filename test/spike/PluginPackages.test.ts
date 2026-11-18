import { expect, test } from 'bun:test';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { Canvas } from '#domain/Canvas.ts';
import { Decimal } from '#domain/Decimal.ts';
import { Group } from '#domain/Group.ts';
import { SvgDocument } from '#domain/SvgDocument.ts';
import { SvgWriter } from '#io/SvgWriter.ts';

// These tests check the assumptions that the plugin host depends on, before the host exists. The
// config file lives in the repository root, so module names resolve from there.
const root = join(import.meta.dir, '..', '..');
const resolve = createRequire(join(root, 'plugins.config.json')).resolve;

async function load(module: string): Promise<unknown> {
  const loaded: { default?: unknown } = await import(pathToFileURL(resolve(module)).href);
  return loaded.default;
}

test('a package name resolves to the entry file of the workspace package', () => {
  expect(resolve('@svgframe/fixture-spike')).toBe(
    join(root, 'test', 'fixtures', 'plugins', 'spike', 'src', 'index.ts'),
  );
});

test('a relative path resolves from the folder of the config file', () => {
  expect(resolve('./test/fixtures/plugins/spike')).toBe(
    join(root, 'test', 'fixtures', 'plugins', 'spike', 'src', 'index.ts'),
  );
});

test('the manifest of a plugin can be imported as JSON', async () => {
  const href = pathToFileURL(resolve('@svgframe/fixture-spike/package.json')).href;
  const manifest: { default: { contributes: unknown } } = await import(href, {
    with: { type: 'json' },
  });
  expect(manifest.default.contributes).toEqual({ shapes: ['spike'] });
});

test('a plugin class extends the kernel Group from the same module instance', async () => {
  const Spike = await load('@svgframe/fixture-spike');
  if (typeof Spike !== 'function') throw new Error('The fixture must export a class.');
  const shape: unknown = Reflect.construct(Spike, ['s1']);
  expect(shape).toBeInstanceOf(Group);
});

test('a plugin shape can be inserted into a kernel canvas, moved, restored and saved', async () => {
  const Spike = await load('./test/fixtures/plugins/spike');
  if (typeof Spike !== 'function') throw new Error('The fixture must export a class.');
  const shape: unknown = Reflect.construct(Spike, ['s1']);
  if (!(shape instanceof Group)) throw new Error('The fixture must extend Group.');
  const document = new SvgDocument(new Canvas(new Decimal(100), new Decimal(100)));
  document.canvas.insert(shape);
  document.create('rect', 'r1', ['1', '2', '3', '4'], 's1');
  const memento = document.move('s1', new Decimal(10), new Decimal(10));
  expect(document.find('r1').attributes()).toContainEqual(['x', '11']);
  memento.restore();
  expect(document.find('r1').attributes()).toContainEqual(['x', '1']);
  expect(new SvgWriter().serialize(document)).toContain('<g id="s1">');
});
