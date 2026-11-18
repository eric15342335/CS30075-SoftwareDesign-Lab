import { type ExtensionContext, languages, window, workspace } from 'vscode';

import { SvgBadgeProvider } from '#ext/SvgBadgeProvider.ts';
import { SvgOutlineProvider } from '#ext/SvgOutlineProvider.ts';

// VS Code calls activate() once, after startup. This entry file is the only one without a class,
// because VS Code looks up the function by its name. It registers the two providers, and VS Code
// disposes of them when the extension stops.
export function activate(context: ExtensionContext): void {
  context.subscriptions.push(
    window.registerFileDecorationProvider(new SvgBadgeProvider(workspace.fs)),
    // The pattern matches SVG files whatever language mode the editor picked for them.
    languages.registerDocumentSymbolProvider({ pattern: '**/*.svg' }, new SvgOutlineProvider()),
  );
}
