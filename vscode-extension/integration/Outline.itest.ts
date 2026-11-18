import { strict as assert } from 'node:assert';

import {
  commands,
  type DocumentSymbol,
  extensions,
  Position,
  type TextDocument,
  Uri,
  workspace,
  WorkspaceEdit,
} from 'vscode';

/** Asks VS Code for the outline of a document, the same way as the Outline view does. */
async function outline(document: TextDocument): Promise<DocumentSymbol[]> {
  const symbols = await commands.executeCommand<DocumentSymbol[] | undefined>(
    'vscode.executeDocumentSymbolProvider',
    document.uri,
  );
  return symbols ?? [];
}

/** Turns the symbols into nested names, so that a test can compare the whole tree at once. */
function names(symbols: readonly DocumentSymbol[]): unknown[] {
  return symbols.map((symbol) =>
    symbol.children.length === 0 ? symbol.name : [symbol.name, names(symbol.children)],
  );
}

suite('SVG outline in the Outline view', () => {
  const folder = workspace.workspaceFolders?.[0]?.uri;

  async function open(name: string): Promise<TextDocument> {
    assert.ok(folder, 'The test needs the fixture folder as its workspace.');
    return workspace.openTextDocument(Uri.joinPath(folder, name));
  }

  suiteSetup(async () => {
    await extensions.getExtension('cs30075.svg-badge-outline')?.activate();
  });

  test('nested groups and an element without an id appear in the outline', async () => {
    const document = await open('example.svg');
    assert.deepEqual(names(await outline(document)), [
      ['svg', [['g#flowchart', ['rect#start', 'text']]]],
    ]);
  });

  test('a click on an element selects its tag name in the source', async () => {
    const document = await open('example.svg');
    const rect = (await outline(document))[0]?.children[0]?.children[0];
    assert.ok(rect);
    assert.equal(document.getText(rect.selectionRange), 'rect');
    assert.equal(rect.selectionRange.start.line, 2);
    assert.ok(document.getText(rect.range).startsWith('<rect id="start"'));
  });

  test('the outline follows an edit of the document', async () => {
    const document = await open('example.svg');
    const edit = new WorkspaceEdit();
    edit.insert(document.uri, new Position(1, 0), '  <circle id="added" r="5"/>\n');
    assert.ok(await workspace.applyEdit(edit));
    const symbols = await outline(document);
    const added = symbols[0]?.children[0];
    assert.equal(added?.name, 'circle#added');
    assert.equal(added && document.getText(added.selectionRange), 'circle');
    assert.equal(added?.selectionRange.start.line, 1);
    await commands.executeCommand('workbench.action.files.revert', document.uri);
  });

  test('incomplete XML gives an empty outline instead of an error', async () => {
    const document = await open('broken.svg');
    assert.deepEqual(await outline(document), []);
  });
});
