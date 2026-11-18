import type { Plugin, PluginContext } from '@svgframe/api';

import { ModifiedStar } from './ModifiedStar.ts';

/**
 * The modified-star plugin marks the rows of `tree` that differ from the last opened or saved
 * document. One instance is both the tree decorator and the workspace observer.
 */
export default class ModifiedStarPlugin implements Plugin {
  activate(context: PluginContext): void {
    const star = new ModifiedStar();
    context.addDecorator(star);
    context.observe(star);
  }
}
