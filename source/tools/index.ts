import React from 'react';
import type {ToolHandler, ToolDefinition, AISDKCoreTool} from '@/types/index';
import {
	newTaskTool,
	updateTaskTool,
	deleteTaskTool,
	listTasksTool,
	searchTasksTool,
} from './definitions/tasks';
import {executeBashTool} from './execute-bash';
import {
	launchCodingSessionTool,
	listCodingSessionsTool,
	closeCodingSessionTool,
} from './definitions/coding-session';

export const toolDefinitions: ToolDefinition[] = [
	newTaskTool,
	updateTaskTool,
	deleteTaskTool,
	listTasksTool,
	searchTasksTool,
	executeBashTool,
	launchCodingSessionTool,
	listCodingSessionsTool,
	closeCodingSessionTool,
];

// Export handlers for manual execution (human-in-the-loop)
export const toolRegistry: Record<string, ToolHandler> = Object.fromEntries(
	toolDefinitions.map(def => [def.name, def.handler]),
);

// Native AI SDK tools registry (for passing directly to AI SDK)
export const nativeToolsRegistry: Record<string, AISDKCoreTool> =
	Object.fromEntries(toolDefinitions.map(def => [def.name, def.tool]));

// Export formatter registry for the UI
export const toolFormatters: Record<
	string,
	(
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		args: any,
	) =>
		| string
		| Promise<string>
		| React.ReactElement
		| Promise<React.ReactElement>
> = Object.fromEntries(
	toolDefinitions
		.filter(def => def.formatter)
		.map(def => {
			const formatter = def.formatter;
			if (!formatter) {
				throw new Error(`Formatter is undefined for tool ${def.name}`);
			}
			return [def.name, formatter];
		}),
);

// Export validator registry
export const toolValidators: Record<
	string,
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(args: any) => Promise<{valid: true} | {valid: false; error: string}>
> = Object.fromEntries(
	toolDefinitions
		.filter(def => def.validator)
		.map(def => {
			const validator = def.validator;
			if (!validator) {
				throw new Error(`Validator is undefined for tool ${def.name}`);
			}
			return [def.name, validator];
		}),
);
