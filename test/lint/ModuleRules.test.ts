import { afterAll, expect, test } from 'bun:test';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// Each probe file breaks, or keeps, one module rule. The test copies the real lint config into a
// temporary folder, writes the probes at the paths that the rules match, and runs oxlint there.
// This proves that each rule catches what it should, which an empty lint run cannot show.
const root = join(import.meta.dir, '..', '..');
const dir = mkdtempSync(join(tmpdir(), 'svg-lint-'));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const probes: Record<string, [imports: string[], errors: number]> = {
  'src/domain/Probe.ts': [['#host/PluginHost.ts', '#api/index.ts', '#builtin/BuiltinShapes.ts'], 3],
  'src/command/Probe.ts': [['@svgframe/plugin-command-stats', '#builtin/BuiltinCommands.ts'], 2],
  'src/io/Probe.ts': [['#api/index.ts', '#domain/Shape.ts'], 1],
  'src/cli/Probe.ts': [['#builtin/BuiltinCommands.ts', '#command/Command.ts'], 1],
  'plugins/demo/src/Probe.ts': [
    ['#domain/Shape.ts', '@svgframe/plugin-other', '@svgframe/testing', '../../other/src/X.ts'],
    4,
  ],
  'plugins/demo/src/Probe.test.ts': [['@svgframe/testing', '@svgframe/api'], 0],
  'app/host/Probe.ts': [['node:fs', '#domain/Shape.ts'], 0],
};

test('each module rule reports the imports that it forbids, and only those', async () => {
  const config: Record<string, unknown> = JSON.parse(
    readFileSync(join(root, '.oxlintrc.json'), 'utf8'),
  );
  // The probes have no tsconfig, so the type-aware options are left out.
  delete config['options'];
  delete config['$schema'];
  writeFileSync(join(dir, '.oxlintrc.json'), JSON.stringify(config));
  for (const [path, [imports]] of Object.entries(probes)) {
    mkdirSync(join(dir, dirname(path)), { recursive: true });
    const lines = imports.map((name, index) => `import probe${index} from '${name}';`);
    const uses = imports.map((_name, index) => `probe${index}`).join(', ');
    writeFileSync(join(dir, path), `${lines.join('\n')}\nexport default [${uses}];\n`);
  }
  const child = Bun.spawn(
    [process.execPath, join(root, 'node_modules', 'oxlint', 'bin', 'oxlint'), '--format', 'json'],
    { cwd: dir, stdout: 'pipe' },
  );
  const report: { diagnostics: Array<{ code: string; filename: string }> } = JSON.parse(
    await new Response(child.stdout).text(),
  );
  await child.exited;
  const counts = Object.fromEntries(Object.keys(probes).map((path) => [path, 0]));
  for (const { code, filename } of report.diagnostics) {
    const path = filename.replaceAll('\\', '/');
    if (code.includes('no-restricted-imports') && path in counts)
      counts[path] = (counts[path] ?? 0) + 1;
  }
  expect(counts).toEqual(
    Object.fromEntries(Object.entries(probes).map(([path, [, errors]]) => [path, errors])),
  );
});
