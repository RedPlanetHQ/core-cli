import type {ToolCall, ToolResult, ToolHandler} from '@/types/index';
import type {ToolManager} from '@/tools/tool-manager';
import {formatError} from '@/utils/error-formatter';
import {parseToolArguments} from '@/utils/tool-args-parser';
import {validateAndFixSchema, getToolSchema} from '@/utils/schema-validator';

// This will be set by the ChatSession
let toolRegistryGetter: (() => Record<string, ToolHandler>) | null = null;

// This will be set by the App
let toolManagerGetter: (() => ToolManager | null) | null = null;

export function setToolRegistryGetter(
	getter: () => Record<string, ToolHandler>,
) {
	toolRegistryGetter = getter;
}

export function setToolManagerGetter(getter: () => ToolManager | null) {
	toolManagerGetter = getter;
}

export function getToolManager(): ToolManager | null {
	return toolManagerGetter ? toolManagerGetter() : null;
}

export async function processToolUse(toolCall: ToolCall): Promise<ToolResult> {
	// Handle XML validation errors by throwing (will be caught and returned as error ToolResult)
	if (toolCall.function.name === '__xml_validation_error__') {
		const args = toolCall.function.arguments as {error: string};
		throw new Error(args.error);
	}

	if (!toolRegistryGetter) {
		throw new Error('Tool registry not initialized');
	}

	const toolRegistry = toolRegistryGetter();
	const handler = toolRegistry[toolCall.function.name];
	if (!handler) {
		throw new Error(`Error: Unknown tool: ${toolCall.function.name}`);
	}

	try {
		// Parse arguments - use strict mode to throw error on parse failure
		// Strict mode is required here to catch malformed arguments before tool execution
		let parsedArgs = parseToolArguments<Record<string, unknown>>(
			toolCall.function.arguments,
			{strict: true},
		);

		// Validate and auto-fix schema structure issues (e.g., flattened nested objects)
		const toolManager = getToolManager();
		// console.log('[DEBUG] Tool manager exists:', !!toolManager);
		if (toolManager) {
			const toolEntry = toolManager.getToolEntry(toolCall.function.name);
			// console.log('[DEBUG] Tool entry for', toolCall.function.name, ':', !!toolEntry);
			if (toolEntry?.tool) {
				const schema = getToolSchema(toolEntry.tool);
				// console.log('[DEBUG] Schema for', toolCall.function.name, ':', JSON.stringify(schema, null, 2));
				// console.log('[DEBUG] Args before fix:', JSON.stringify(parsedArgs, null, 2));
				if (schema) {
					const validation = validateAndFixSchema(parsedArgs, schema);
					// console.log('[DEBUG] Validation result:', validation);
					if (validation.fixed) {
						// Schema was auto-fixed, use the fixed version
						parsedArgs = validation.fixed;
						// console.log('[DEBUG] Args after fix:', JSON.stringify(parsedArgs, null, 2));
						// Log the fix for debugging
						console.warn(
							`[Schema Auto-Fix] ${toolCall.function.name}:`,
							validation.errors?.join('; '),
						);
					}
				}
			}
		}

		const result = await handler(parsedArgs);
		return {
			tool_call_id: toolCall.id,
			role: 'tool',
			name: toolCall.function.name,
			content: result,
		};
	} catch (error) {
		// Convert exceptions to error messages that the model can see and correct
		const errorMessage = `Error: ${formatError(error)}`;
		return {
			tool_call_id: toolCall.id,
			role: 'tool',
			name: toolCall.function.name,
			content: errorMessage,
		};
	}
}
