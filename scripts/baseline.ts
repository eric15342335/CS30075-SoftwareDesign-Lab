// Records the output of the tag `final` (Phase 1) for the transcripts in doc/transcript/. The e2e
// tests compare the Phase 2 editor without plugins against these files byte for byte.
//
//   bun scripts/baseline.ts
//
// The script checks out `final` into .baseline/final inside the repository, so that the old code
// finds the same node_modules, and removes the worktree again at the end.
import { mkdirSync, readFileSync, rmSync, rmdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { repo } from '#test/support/Paths.ts';
import { TempFolder } from '#test/support/TempFolder.ts';
import { TranscriptRunner } from '#test/support/TranscriptRunner.ts';

const { root, transcripts } = repo;
const worktree = join(root, '.baseline', 'final');
const git = (...args: string[]): void => {
  const result = Bun.spawnSync(['git', ...args], {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  });
  if (!result.success) throw new Error(`git ${args.join(' ')} failed`);
};

git('worktree', 'add', '--detach', worktree, 'final');
try {
  using folder = new TempFolder();
  const runner = new TranscriptRunner(folder.path, join(worktree, 'src', 'main.ts'));
  for (const name of ['cli-1', 'cli-2']) {
    const input = readFileSync(join(transcripts, `${name}.txt`), 'utf8');
    // oxlint-disable-next-line no-await-in-loop
    const result = await runner.run([], input);
    const expected = join(transcripts, 'expected', name);
    rmSync(expected, { recursive: true, force: true });
    mkdirSync(expected, { recursive: true });
    writeFileSync(join(transcripts, 'expected', `${name}.out`), result.stdout);
    for (const [file, text] of Object.entries(result.files))
      writeFileSync(join(expected, file), text);
    process.stdout.write(`${name}: saved ${Object.keys(result.files).join(', ')}
`);
  }
} finally {
  git('worktree', 'remove', '--force', worktree);
  try {
    rmdirSync(join(root, '.baseline'));
  } catch {
    // .baseline holds other files, so it stays.
  }
}
