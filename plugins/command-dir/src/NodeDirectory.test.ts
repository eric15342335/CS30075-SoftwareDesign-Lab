import { afterAll, expect, test } from 'bun:test';
import * as fs from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DirectoryListing } from './DirectoryListing.ts';
import { NodeDirectory } from './NodeDirectory.ts';

const root = fs.mkdtempSync(join(tmpdir(), 'svg-dir-'));
afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

/** Returns the lines of `dir` for a folder, through the real node:fs adapter. */
function list(folder: string): string[] {
  return new DirectoryListing(new NodeDirectory(fs, () => folder)).lines();
}

test('the real adapter lists a temporary folder with folders, files and hidden items', () => {
  const folder = join(root, 'mixed');
  fs.mkdirSync(join(folder, 'docs', 'deep'), { recursive: true });
  fs.mkdirSync(join(folder, '.cache'));
  fs.writeFileSync(join(folder, 'demo.svg'), '<svg/>');
  fs.writeFileSync(join(folder, '.hidden'), '');
  expect(list(folder)).toEqual([
    '[DIR]  .cache',
    '[DIR]  docs',
    '[FILE] .hidden',
    '[FILE] demo.svg',
  ]);
});

test('the real adapter reports an empty folder and a folder that does not exist', () => {
  const empty = join(root, 'empty');
  fs.mkdirSync(empty);
  expect(list(empty)).toEqual(['(empty directory)']);
  const missing = join(root, 'missing');
  expect(() => list(missing)).toThrow(`cannot read directory: ${missing}`);
});

test('the adapter asks for the path at each call, so it follows the working directory', () => {
  let current = join(root, 'empty');
  const directory = new NodeDirectory(fs, () => current);
  expect(directory.path()).toBe(join(root, 'empty'));
  current = join(root, 'mixed');
  expect(directory.entries().map((entry) => entry.name)).toContain('demo.svg');
});
