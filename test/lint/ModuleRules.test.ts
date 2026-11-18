import { expect, test } from 'bun:test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { repo } from '#test/support/Paths.ts';
import { TempFolder } from '#test/support/TempFolder.ts';

// Each probe file imports modules that its rule allows and modules that it forbids. The test
// copies the real lint config into a temporary folder, writes the probes at the paths that the
// rules match, runs oxlint there, and compares the reported imports with the forbidden ones.
// This proves that each rule catches what it should, which an empty lint run cannot show.

const probes: Record<string, { allowed: string[]; forbidden: string[] }> = {
  'src/domain/Probe.ts': {
    allowed: ['#domain/Shape.ts'],
    forbidden: ['#host/PluginHost.ts', '#api/index.ts', '#test/support/Paths.ts', 'node:fs'],
  },
  'src/io/Probe.ts': {
    allowed: ['#domain/Shape.ts', 'node:fs', 'fast-xml-parser'],
    forbidden: ['#api/index.ts', 'node:path', 'commander'],
  },
  'src/command/Probe.ts': {
    allowed: ['#io/SvgReader.ts', '#domain/Shape.ts'],
    forbidden: ['@svgframe/plugin-command-stats', '#builtin/BuiltinCommands.ts', '#scripts/x.ts'],
  },
  'src/cli/Probe.ts': {
    allowed: ['#command/Command.ts', '@commander-js/extra-typings', 'node:readline'],
    forbidden: ['#builtin/BuiltinCommands.ts', '#io/SvgReader.ts', 'node:fs'],
  },
  'src/builtin/Probe.ts': {
    allowed: ['#command/Command.ts'],
    forbidden: ['#cli/CliProgram.ts', 'node:fs'],
  },
  'src/api/Probe.ts': {
    allowed: ['#command/Command.ts'],
    forbidden: ['#host/PluginHost.ts', '../../other/X.ts'],
  },
  'plugins/demo/src/Probe.ts': {
    allowed: ['@svgframe/api', 'node:fs', './Other.ts'],
    forbidden: [
      '#domain/Shape.ts',
      '@svgframe/plugin-other',
      '@svgframe/testing',
      '../../other/src/X.ts',
      'commander',
    ],
  },
  'plugins/demo/src/Probe.test.ts': {
    allowed: ['@svgframe/testing', '@svgframe/api', 'bun:test', 'node:fs', './Probe.ts'],
    forbidden: ['#domain/Shape.ts', '@svgframe/plugin-other'],
  },
  'app/host/Probe.ts': {
    allowed: ['node:fs', '#domain/Shape.ts', '@svgframe/plugin-shape-box'],
    forbidden: ['../other/X.ts'],
  },
};

test('each module rule reports the imports that it forbids, and only those', async () => {
  using dir = new TempFolder();
  const config: Record<string, unknown> = JSON.parse(
    readFileSync(join(repo.root, '.oxlintrc.json'), 'utf8'),
  );
  // The probes have no tsconfig, so the type-aware options are left out.
  delete config['options'];
  delete config['$schema'];
  writeFileSync(dir.file('.oxlintrc.json'), JSON.stringify(config));
  for (const [path, { allowed, forbidden }] of Object.entries(probes)) {
    const imports = [...allowed, ...forbidden];
    mkdirSync(dir.file(dirname(path)), { recursive: true });
    const lines = imports.map((name, index) => `import probe${index} from '${name}';`);
    const uses = imports.map((_name, index) => `probe${index}`).join(', ');
    writeFileSync(dir.file(path), `${lines.join('\n')}\nexport default [${uses}];\n`);
  }
  const child = Bun.spawn(
    [
      process.execPath,
      join(repo.root, 'node_modules', 'oxlint', 'bin', 'oxlint'),
      '--format',
      'json',
    ],
    { cwd: dir.path, stdout: 'pipe' },
  );
  const report: { diagnostics: Array<{ code: string; filename: string; message: string }> } =
    JSON.parse(await new Response(child.stdout).text());
  expect(await child.exited).toBe(1);
  const reported = Object.fromEntries(Object.keys(probes).map((path) => [path, [] as string[]]));
  for (const { code, filename, message } of report.diagnostics) {
    const name = /^'(.+)' import is restricted/.exec(message)?.[1];
    if (code.includes('no-restricted-imports') && name !== undefined) {
      reported[filename.replaceAll('\\', '/')]?.push(name);
    }
  }
  for (const [path, { forbidden }] of Object.entries(probes)) {
    expect({ path, imports: reported[path]?.toSorted() }).toEqual({
      path,
      imports: forbidden.toSorted(),
    });
  }
});
