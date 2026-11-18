import { type ExtensionContext, window, workspace } from 'vscode';

import { SvgBadgeProvider } from '#ext/SvgBadgeProvider.ts';

// VS Code calls activate() once, after startup. This entry file is the only one without a class,
// because VS Code looks up the function by its name. It registers the providers, and VS Code
// disposes of them when the extension stops.
export function activate(context: ExtensionContext): void {
  context.subscriptions.push(
    window.registerFileDecorationProvider(new SvgBadgeProvider(workspace.fs)),
  );
}
