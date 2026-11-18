import { expect, test } from 'bun:test';

import type { Directory } from './Directory.ts';
import type { DirectoryEntry } from './DirectoryEntry.ts';
import { DirectoryListing } from './DirectoryListing.ts';

/** A test double for the Directory interface. It returns fixed entries, or fails when told to. */
class FakeDirectory implements Directory {
  readonly #entries: DirectoryEntry[] | null;

  /** Null entries make `entries` throw, like a directory that cannot be read. */
  constructor(entries: DirectoryEntry[] | null) {
    this.#entries = entries;
  }

  path(): string {
    return '/work/here';
  }

  entries(): DirectoryEntry[] {
    if (this.#entries === null) throw new Error('EACCES: permission denied');
    return [...this.#entries];
  }
}

const dir = (name: string): DirectoryEntry => ({ name, directory: true });
const file = (name: string): DirectoryEntry => ({ name, directory: false });

test('directories come first, then files, each sorted by name in code unit order', () => {
  const listing = new DirectoryListing(
    new FakeDirectory([file('demo.svg'), dir('plugins'), file('Zeta.txt'), dir('docs'), file('a')]),
  );
  expect(listing.lines()).toEqual([
    '[DIR]  docs',
    '[DIR]  plugins',
    '[FILE] Zeta.txt',
    '[FILE] a',
    '[FILE] demo.svg',
  ]);
});

test('hidden items are listed like any other item', () => {
  const listing = new DirectoryListing(new FakeDirectory([file('.env'), dir('.git'), file('b')]));
  expect(listing.lines()).toEqual(['[DIR]  .git', '[FILE] .env', '[FILE] b']);
});

test('the order is the same whatever order the directory gives', () => {
  const entries = [dir('b'), file('c'), dir('a'), file('d'), file('C')];
  const forward = new DirectoryListing(new FakeDirectory(entries)).lines();
  const backward = new DirectoryListing(new FakeDirectory(entries.toReversed())).lines();
  expect(backward).toEqual(forward);
});

test('an empty directory prints one line that says so', () => {
  expect(new DirectoryListing(new FakeDirectory([])).lines()).toEqual(['(empty directory)']);
});

test('a directory that cannot be read gives the error with its path', () => {
  expect(() => new DirectoryListing(new FakeDirectory(null)).lines()).toThrow(
    'cannot read directory: /work/here',
  );
});
