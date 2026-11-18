import { strict as assert } from 'node:assert';

import { extensions, Uri, workspace } from 'vscode';

import { SvgBadgeProvider } from '#ext/SvgBadgeProvider.ts';

// There is no API to read the badges that the Explorer shows. So this suite checks that the
// extension is active and then asks a provider about real items, through the real file system of
// the Extension Host.
suite('SVG badge in the Explorer', () => {
  const folder = workspace.workspaceFolders?.[0]?.uri;
  const provider = new SvgBadgeProvider(workspace.fs);

  async function badge(name: string): Promise<string | undefined> {
    assert.ok(folder, 'The test needs the fixture folder as its workspace.');
    return (await provider.provideFileDecoration(Uri.joinPath(folder, name)))?.badge;
  }

  test('the extension is active after startup', async () => {
    const extension = extensions.getExtension('cs30075.svg-badge-outline');
    assert.ok(extension);
    await extension.activate();
    assert.equal(extension.isActive, true);
  });

  test('an SVG file gets the badge []', async () => {
    assert.equal(await badge('example.svg'), '[]');
  });

  test('a folder whose name ends with .svg gets no badge', async () => {
    assert.equal(await badge('x.svg'), undefined);
  });

  test('a text file gets no badge', async () => {
    assert.equal(await badge('notes.txt'), undefined);
  });

  test('an SVG path that does not exist gets no badge and does not throw', async () => {
    assert.equal(await badge('missing.svg'), undefined);
  });
});
