/**
 * Common tool execution logic for main agent and subagents
 * Handles approval flow uniformly
 */

import type {ToolCall, ToolResult, ToolProgressUpdate} from '@/types/core';
import {approvalRegistry, type ApprovalMetadata} from './approval-registry';
import {processToolUse, getToolManager} from '@/message-handler';
import {parseToolArguments} from './tool-args-parser';
import {formatError} from './error-formatter';

export interface ExecuteToolsWithApprovalOptions {
	toolCalls: ToolCall[];
	metadata: ApprovalMetadata;
	developmentMode?: 'normal' | 'auto-accept';
	nonInteractiveMode?: boolean;
	onToolExecuting?: (toolCall: ToolCall) => void;
	onToolExecuted?: (toolCall: ToolCall, result: ToolResult) => void;
	onProgress?: (toolCall: ToolCall, update: ToolProgressUpdate) => void;
	onNonInteractiveExit?: (errorMsg: string) => void;
}

/**
 * Execute multiple tool calls with approval checks
 * Returns array of tool results
 */
export async function executeToolsWithApproval(
	options: ExecuteToolsWithApprovalOptions,
): Promise<ToolResult[]> {
	const {
		toolCalls,
		metadata,
		developmentMode = 'normal',
		nonInteractiveMode = false,
		onToolExecuting,
		onToolExecuted,
		onNonInteractiveExit,
	} = options;

	const toolManager = getToolManager();
	const toolResults: ToolResult[] = [];

	for (const toolCall of toolCalls) {
		// Check if this tool needs approval
		let toolNeedsApproval = true;
		if (toolManager) {
			const toolEntry = toolManager.getToolEntry(toolCall.function.name);
			if (toolEntry?.tool) {
				const needsApprovalProp = (
					toolEntry.tool as unknown as {
						needsApproval?:
							| boolean
							| ((args: unknown) => boolean | Promise<boolean>);
					}
				).needsApproval;
				if (typeof needsApprovalProp === 'boolean') {
					toolNeedsApproval = needsApprovalProp;
				} else if (typeof needsApprovalProp === 'function') {
					try {
						const parsedArgs = parseToolArguments(toolCall.function.arguments);
						toolNeedsApproval = await (
							needsApprovalProp as (args: unknown) => boolean | Promise<boolean>
						)(parsedArgs);
					} catch {
						toolNeedsApproval = true;
					}
				}
			}
		}

		// Check if it's bash tool (always needs approval even in auto-accept)
		const isBashTool = toolCall.function.name === 'execute_bash';

		// Check if validation failed
		let validationFailed = false;
		if (toolCall.function.name === '__xml_validation_error__') {
			validationFailed = true;
		} else if (toolManager) {
			const validator = toolManager.getToolValidator(toolCall.function.name);
			if (validator) {
				try {
					const parsedArgs = parseToolArguments(toolCall.function.arguments);
					const validationResult = await validator(parsedArgs);
					if (!validationResult.valid) {
						validationFailed = true;
					}
				} catch {
					validationFailed = true;
				}
			}
		}

		// Request approval if needed
		if (
			!validationFailed &&
			toolNeedsApproval &&
			!(developmentMode === 'auto-accept' && !isBashTool)
		) {
			// In non-interactive mode, exit when tool approval is required
			if (nonInteractiveMode) {
				const errorMsg = `Tool approval required for: ${toolCall.function.name}. Exiting non-interactive mode`;
				if (onNonInteractiveExit) {
					onNonInteractiveExit(errorMsg);
				}
				throw new Error(errorMsg);
			}

			// Request approval via registry
			try {
				const approved = await approvalRegistry.request(toolCall, metadata);

				if (!approved) {
					// User cancelled - add cancellation result
					toolResults.push({
						tool_call_id: toolCall.id,
						role: 'tool' as const,
						name: toolCall.function.name,
						content: 'Tool execution cancelled by user',
					});
					continue;
				}
			} catch (error) {
				// Approval was cancelled or errored
				toolResults.push({
					tool_call_id: toolCall.id,
					role: 'tool' as const,
					name: toolCall.function.name,
					content: `Tool execution cancelled: ${
						error instanceof Error ? error.message : 'Unknown error'
					}`,
				});
				continue;
			}
		}

		// Execute the tool
		if (onToolExecuting) {
			onToolExecuting(toolCall);
		}

		try {
			// Track tool execution with progress
			const result = await processToolUse(toolCall, {
				toolCallId: toolCall.id,
			});

			toolResults.push(result);

			if (onToolExecuted) {
				onToolExecuted(toolCall, result);
			}
		} catch (error) {
			const errorResult: ToolResult = {
				tool_call_id: toolCall.id,
				role: 'tool' as const,
				name: toolCall.function.name,
				content: `Error: ${formatError(error)}`,
			};
			toolResults.push(errorResult);

			if (onToolExecuted) {
				onToolExecuted(toolCall, errorResult);
			}
		}
	}

	return toolResults;
}
