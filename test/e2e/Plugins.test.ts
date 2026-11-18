import { expect, test } from 'bun:test';
import { join } from 'node:path';

const root = join(import.meta.dir, '..', '..');
const main = join(root, 'app', 'main.ts');
const shipped = join(root, 'plugins.config.json');

/** Runs the real program with the flags and the input lines, and returns stdout. */
async function run(flags: string[], lines: string[]): Promise<string> {
  const child = Bun.spawn([process.execPath, main, ...flags], {
    cwd: root,
    env: { ...process.env, NO_COLOR: '1' },
    stdin: new Blob([`${lines.join('\n')}\n`]),
  });
  const output = await new Response(child.stdout).text();
  expect(await child.exited).toBe(0);
  return output;
}

test.each([[[]], [['--config', shipped]]])(
  'the code assembly and plugins.config.json (%j) both load stats',
  async (flags) => {
    const output = await run(flags, ['init', 'create rect r 0 0 1 1', 'stats']);
    expect(output).toContain('svg> stats\nrect: 1  (total 1, containers 0)\n');
  },
);
