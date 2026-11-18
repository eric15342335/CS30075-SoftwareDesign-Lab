// This file is the only import surface for plugins. A plugin imports from "@svgframe/api", and the
// tsconfig maps that name to this file. Plugins never import the kernel's internal paths.
export { Group } from '#domain/Group.ts';
