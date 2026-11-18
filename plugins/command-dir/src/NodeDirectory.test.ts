import { expect, test } from 'bun:test';
import * as fs from 'node:fs';

import { TempFolder } from '@svgframe/testing';

import { DirectoryListing } from './DirectoryListing.ts';
import { NodeDirectory } from './NodeDirectory.ts';

/** Returns the lines of `dir` for a folder, through the real node:fs adapter. */
function list(folder: string): string[] {
  return new DirectoryListing(new NodeDirectory(fs, () => folder)).lines();
}

test('the real adapter lists a temporary folder with folders, files and hidden items', () => {
  using folder = new TempFolder();
  fs.mkdirSync(folder.file('docs', 'deep'), { recursive: true });
  fs.mkdirSync(folder.file('.cache'));
  fs.writeFileSync(folder.file('demo.svg'), '<svg/>');
  fs.writeFileSync(folder.file('.hidden'), '');
  expect(list(folder.path)).toEqual([
    '[DIR]  .cache',
    '[DIR]  docs',
    '[FILE] .hidden',
    '[FILE] demo.svg',
  ]);
});

test('the real adapter reports an empty folder and a folder that does not exist', () => {
  using folder = new TempFolder();
  expect(list(folder.path)).toEqual(['(empty directory)']);
  const missing = folder.file('missing');
  expect(() => list(missing)).toThrow(`cannot read directory: ${missing}`);
});

test('the adapter asks for the path at each call, so it follows the working directory', () => {
  using empty = new TempFolder();
  using full = new TempFolder();
  fs.writeFileSync(full.file('demo.svg'), '<svg/>');
  let current = empty.path;
  const directory = new NodeDirectory(fs, () => current);
  expect(directory.entries()).toEqual([]);
  current = full.path;
  expect(directory.path()).toBe(full.path);
  expect(directory.entries().map((entry) => entry.name)).toEqual(['demo.svg']);
});
