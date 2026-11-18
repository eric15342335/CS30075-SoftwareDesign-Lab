import { defineConfig } from '@vscode/test-cli';

// The tests run inside a real Extension Host. CI downloads this pinned VS Code version into
// .vscode-test/. On a machine with VS Code installed, VSCODE_TEST_PATH can point at Code.exe instead.
const installed = process.env.VSCODE_TEST_PATH;

export default defineConfig({
  files: 'out/integration/**/*.itest.js',
  workspaceFolder: 'integration/fixture',
  ...(installed ? { useInstallation: { fromPath: installed } } : { version: '1.146.0' }),
  launchArgs: ['--disable-extensions'],
  mocha: { ui: 'tdd', timeout: 20000 },
});
