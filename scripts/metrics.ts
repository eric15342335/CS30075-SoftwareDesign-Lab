// Writes docs/metrics/ from the git history: the file list with responsibilities, the lines split
// into kernel, assembly and plugins, and the change in cyclomatic complexity between two refs.
//
//   bun scripts/metrics.ts [--from final] [--to HEAD]
//
// Each ref is taken with `git archive`, so uncommitted changes never count.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { MetricsReport } from '#scripts/metrics/MetricsReport.ts';
import type { Snapshot } from '#scripts/metrics/MetricsReport.ts';
import { RoleMap } from '#scripts/metrics/RoleMap.ts';
import { TreeMetrics } from '#scripts/metrics/TreeMetrics.ts';

const root = join(import.meta.dir, '..');
const args = process.argv.slice(2);
const option = (name: string, fallback: string): string => {
  const at = args.indexOf(name);
  return at === -1 ? fallback : (args[at + 1] ?? fallback);
};
const run = (command: string[], cwd: string): string => {
  const result = Bun.spawnSync(command, { cwd, stderr: 'inherit' });
  if (!result.success) throw new Error(`${command.join(' ')} failed`);
  return result.stdout.toString().trim();
};

const scratch = mkdtempSync(join(tmpdir(), 'svg-metrics-'));
try {
  const snapshot = (ref: string, listed: boolean): Snapshot => {
    const tree = join(scratch, ref.replaceAll(/[^\w.-]/g, '_'));
    mkdirSync(tree);
    run(['git', 'archive', '--format=tar', '-o', `${tree}.tar`, ref], root);
    // A relative archive path keeps tar from reading "C:" as a remote host.
    run(['tar', '-xf', `../${ref.replaceAll(/[^\w.-]/g, '_')}.tar`], tree);
    const files = new TreeMetrics(tree, new RoleMap(ref), listed).measure();
    return { ref, commit: run(['git', 'rev-parse', '--short', `${ref}^{commit}`], root), files };
  };
  const report = new MetricsReport(
    snapshot(option('--from', 'final'), false),
    snapshot(option('--to', 'HEAD'), true),
  );
  const out = join(root, 'docs', 'metrics');
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'README.md'), report.markdown());
  writeFileSync(join(out, 'metrics.json'), report.json());
  process.stdout.write(`wrote ${out}\n`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
