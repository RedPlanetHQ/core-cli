import React from 'react';
import type {ToolCall, ToolResult} from '@/types/index';
import type {ToolManager} from '@/tools/tool-manager';
import {parseToolArguments} from '@/utils/tool-args-parser';
import ToolMessage from '@/components/tool-message';
import ErrorMessage from '@/components/error-message';

/**
 * Display tool result with proper formatting
 * Extracted to eliminate duplication between useChatHandler and useToolHandler
 *
 * @param toolCall - The tool call that was executed
 * @param result - The result from tool execution
 * @param toolManager - The tool manager instance (for formatters)
 * @param addToChatQueue - Function to add components to chat queue
 * @param componentKeyCounter - Counter for generating unique React keys
 */
export async function displayToolResult(
	toolCall: ToolCall,
	result: ToolResult,
	toolManager: ToolManager | null,
	addToChatQueue: (component: React.ReactNode) => void,
	componentKeyCounter: number,
): Promise<void> {
	// Check if this is an error result
	const isError = result.content.startsWith('Error: ');

	if (isError) {
		// Display as error message
		const errorMessage = result.content.replace(/^Error: /, '');
		addToChatQueue(
			<ErrorMessage
				key={`tool-error-${
					result.tool_call_id
				}-${componentKeyCounter}-${Date.now()}`}
				message={errorMessage}
				hideBox={true}
			/>,
		);
		return;
	}

	if (toolManager) {
		const formatter = toolManager.getToolFormatter(result.name);
		if (formatter) {
			try {
				const parsedArgs = parseToolArguments(toolCall.function.arguments);
				const formattedResult = await formatter(parsedArgs, result.content);

				if (React.isValidElement(formattedResult)) {
					addToChatQueue(
						React.cloneElement(formattedResult, {
							key: `tool-result-${
								result.tool_call_id
							}-${componentKeyCounter}-${Date.now()}`,
						}),
					);
				} else {
					addToChatQueue(
						<ToolMessage
							key={`tool-result-${
								result.tool_call_id
							}-${componentKeyCounter}-${Date.now()}`}
							title={`⚒ ${result.name}`}
							message={String(formattedResult)}
							hideBox={true}
						/>,
					);
				}
			} catch {
				// If formatter fails, show raw result
				addToChatQueue(
					<ToolMessage
						key={`tool-result-${result.tool_call_id}-${componentKeyCounter}`}
						title={`⚒ ${result.name}`}
						message={result.content}
						hideBox={true}
					/>,
				);
			}
		} else {
			// No formatter, show raw result
			addToChatQueue(
				<ToolMessage
					key={`tool-result-${result.tool_call_id}-${componentKeyCounter}`}
					title={`⚒ ${result.name}`}
					message={result.content}
					hideBox={true}
				/>,
			);
		}
	}
}
