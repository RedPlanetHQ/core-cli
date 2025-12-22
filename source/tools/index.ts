import React from 'react';
import type {ToolHandler, CoreToolExport, AISDKCoreTool} from '@/types/index';
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
	deleteCodingSessionTool,
	clearCodingSessionsTool,
} from './definitions/coding-session';

export const toolDefinitions: CoreToolExport[] = [
	newTaskTool,
	updateTaskTool,
	deleteTaskTool,
	listTasksTool,
	searchTasksTool,
	executeBashTool,
	launchCodingSessionTool,
	listCodingSessionsTool,
	closeCodingSessionTool,
	deleteCodingSessionTool,
	clearCodingSessionsTool,
];

// Export handlers for manual execution (human-in-the-loop)
// These are extracted from the AI SDK tools' execute functions
export const toolRegistry: Record<string, ToolHandler> = Object.fromEntries(
	toolDefinitions.map(t => [
		t.name,
		// Extract the execute function from the AI SDK tool
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		async (args: any) => {
			// Call the tool's execute function with a dummy options object
			// The actual options will be provided by AI SDK during automatic execution
			// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
			return await (t.tool as any).execute(args, {
				toolCallId: 'manual',
				messages: [],
			});
		},
	]),
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
