// This file is the only import surface for plugins. A plugin imports from "@svgframe/api", and the
// tsconfig maps that name to this file. Plugins never import the kernel's internal paths.
export type { Plugin } from '#api/Plugin.ts';
export type { PluginContext } from '#api/PluginContext.ts';
export { Command } from '#command/Command.ts';
export type { CommandContext } from '#command/CommandContext.ts';
export type { CommandProvider } from '#command/CommandProvider.ts';
export type { TreeDecorator } from '#command/TreeDecorator.ts';
export type { Workspace } from '#command/Workspace.ts';
export type { WorkspaceObserver } from '#command/WorkspaceObserver.ts';
export type { AttributeEdit } from '#domain/AttributeEdit.ts';
export type { AttributeHandler } from '#domain/AttributeHandler.ts';
export { BasicShapeProvider } from '#domain/BasicShapeProvider.ts';
export type { Catalog } from '#domain/Catalog.ts';
export { Decimal } from '#domain/Decimal.ts';
export { EditorError } from '#domain/EditorError.ts';
export { Group } from '#domain/Group.ts';
export type { Shape } from '#domain/Shape.ts';
export type { ShapeProvider } from '#domain/ShapeProvider.ts';
export type { SvgDocument } from '#domain/SvgDocument.ts';
