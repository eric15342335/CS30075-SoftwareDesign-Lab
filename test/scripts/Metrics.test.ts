import { afterAll, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import type { FileMetric } from '#scripts/metrics/FileMetric.ts';
import { MetricsReport } from '#scripts/metrics/MetricsReport.ts';
import { RoleMap } from '#scripts/metrics/RoleMap.ts';
import { TreeMetrics } from '#scripts/metrics/TreeMetrics.ts';

const scratch = mkdtempSync(join(tmpdir(), 'svg-metrics-test-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

/** Writes a small tree of files into a new folder and returns the folder. */
function tree(name: string, files: Record<string, string>): string {
  const root = join(scratch, name);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

test('the role map sorts files by directory, and a reviewed override wins for its ref', () => {
  const roles = new RoleMap('HEAD');
  expect(roles.role('src/domain/Shape.ts')).toBe('kernel');
  expect(roles.role('src/main.ts')).toBe('kernel');
  expect(roles.role('app/host/PluginHost.ts')).toBe('assembly');
  expect(roles.role('plugins/stats/src/index.ts')).toBe('plugins');
  expect(roles.role('plugins/stats/test/Stats.test.ts')).toBe('tests');
  expect(roles.role('vscode-extension/src/SvgOutline.ts')).toBe('vscode');
  expect(roles.role('vscode-extension/integration/Badge.itest.ts')).toBe('tests');
  expect(roles.role('scripts/metrics.ts')).toBe('scripts');
  expect(new RoleMap('final').role('src/main.ts')).toBe('assembly');
  expect(() => roles.role('setup.ts')).toThrow('unclassified file: setup.ts');
});

test('a tree is measured file by file, with lines, units, complexity and responsibility', () => {
  const root = tree('good', {
    'src/Thing.ts':
      '/**\n * Thing does one job. It does it well.\n */\nexport class Thing {\n  f(x: number): number {\n    return x > 0 ? 1 : 2;\n  }\n}\n',
    'app/main.ts':
      "import { Thing } from './Thing.ts';\n\n// The entry point. It wires.\nnew Thing();\n",
    'plugins/p/src/index.ts': '/** The plugin P. */\nexport default class P {}\n',
    'test/Thing.test.ts': 'const check = (a: boolean): number => (a ? 1 : 0);\ncheck(true);\n',
    'node_modules/dep/index.ts': 'export const skipped = true;\n',
  });
  const files = new TreeMetrics(root, new RoleMap('HEAD'), true).measure();
  expect(files).toEqual([
    {
      path: 'app/main.ts',
      role: 'assembly',
      lines: 3,
      functions: 0,
      complexity: 0,
      responsibility: 'The entry point.',
    },
    {
      path: 'plugins/p/src/index.ts',
      role: 'plugins',
      lines: 2,
      functions: 0,
      complexity: 0,
      responsibility: 'The plugin P.',
    },
    {
      path: 'src/Thing.ts',
      role: 'kernel',
      lines: 8,
      functions: 1,
      complexity: 2,
      responsibility: 'Thing does one job.',
    },
    {
      path: 'test/Thing.test.ts',
      role: 'tests',
      lines: 2,
      functions: 1,
      complexity: 2,
      responsibility: '',
    },
  ]);
});

test('a listed file without a doc comment is an error, and an older tree needs none', () => {
  const root = tree('bare', { 'src/Bare.ts': 'export class Bare {}\n' });
  expect(() => new TreeMetrics(root, new RoleMap('HEAD'), true).measure()).toThrow(
    'no responsibility for src/Bare.ts',
  );
  expect(new TreeMetrics(root, new RoleMap('HEAD'), false).measure()[0]?.responsibility).toBe('');
});

/** Returns a measured file with ten lines and one unit. */
function file(path: string, role: FileMetric['role'], complexity: number): FileMetric {
  return { path, role, lines: 10, functions: 1, complexity, responsibility: 'Does | things.' };
}

test('the report sums each category and lists every file whose complexity changed', () => {
  const report = new MetricsReport(
    {
      ref: 'final',
      commit: 'aaa',
      files: [file('src/A.ts', 'kernel', 3), file('src/Gone.ts', 'kernel', 2)],
    },
    {
      ref: 'p2',
      commit: 'bbb',
      files: [
        file('src/A.ts', 'kernel', 3),
        file('app/B.ts', 'assembly', 4),
        file('test/B.test.ts', 'tests', 1),
      ],
    },
  );
  const text = report.markdown();
  expect(text).toContain('`bun scripts/metrics.ts --from final --to p2`');
  expect(text).toContain('| 内核 | 2 → 1 (-1) | 20 → 10 (-10) | 2 → 1 (-1) | 5 → 3 (-2) |');
  expect(text).toContain('| 装配处 | 0 → 1 (+1) | 0 → 10 (+10) | 0 → 1 (+1) | 0 → 4 (+4) |');
  expect(text).toContain('| `app/B.ts` | 装配处 | 0 | 4 | +4 |');
  expect(text).toContain('| `src/Gone.ts` | 内核 | 2 | 0 | -2 |');
  expect(text).not.toContain('| `src/A.ts` | 内核 | 3 | 3 |');
  expect(text).toContain('| `app/B.ts` | 装配处 | 10 | 4 | Does \\| things. |');
  expect(text).toContain('| `test/B.test.ts` | 10 |');
  expect(JSON.parse(report.json())).toEqual({
    from: {
      ref: 'final',
      commit: 'aaa',
      files: [file('src/A.ts', 'kernel', 3), file('src/Gone.ts', 'kernel', 2)],
    },
    to: {
      ref: 'p2',
      commit: 'bbb',
      files: [
        file('src/A.ts', 'kernel', 3),
        file('app/B.ts', 'assembly', 4),
        file('test/B.test.ts', 'tests', 1),
      ],
    },
  });
});
