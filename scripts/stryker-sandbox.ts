import { copyFileSync } from 'node:fs';
import { join } from 'node:path';

// Stryker runs this script inside its sandbox, .stryker-tmp/sandbox-<id>/, before the dry run.
// Stryker leaves tsconfig.json out of the sandbox, because it would rewrite the file through the
// TypeScript compiler API, which TypeScript 7 does not ship. Without a copy, Bun finds the
// tsconfig.json of the real project two folders up, and @svgframe/api then loads the real src/
// instead of the mutated one. The same happens with the workspace links in a shared node_modules.
// So the sandbox gets a copy of tsconfig.json and its own node_modules.
const sandbox = process.cwd();
copyFileSync(join(sandbox, '..', '..', 'tsconfig.json'), join(sandbox, 'tsconfig.json'));
// --ignore-scripts keeps the prepare script from installing git hooks from inside the sandbox.
const install = Bun.spawnSync(['bun', 'install', '--frozen-lockfile', '--ignore-scripts'], {
  cwd: sandbox,
  stdout: 'inherit',
  stderr: 'inherit',
});
process.exit(install.exitCode);
