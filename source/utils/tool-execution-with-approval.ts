/**
 * Unified tool execution with approval
 * Handles approval flow for both main agent and subagents
 */

import type {ToolCall, ToolResult} from '@/types/core';
import {approvalRegistry, type ApprovalMetadata} from './approval-registry';
import {processToolUse} from '@/message-handler';
import {parseToolArguments} from './tool-args-parser';
import {getToolManager} from '@/message-handler';

interface ExecuteToolWithApprovalOptions {
	toolCall: ToolCall;
	metadata: ApprovalMetadata;
	developmentMode?: 'normal' | 'auto-accept';
	onProgress?: (update: any) => void;
}

/**
 * Execute a tool with approval if needed
 * Returns the tool result
 */
export async function executeToolWithApproval({
	toolCall,
	metadata,
	developmentMode = 'normal',
	onProgress,
}: ExecuteToolWithApprovalOptions): Promise<ToolResult> {
	const toolManager = getToolManager();

	// Check if tool needs approval
	let toolNeedsApproval = true; // Default to requiring approval for safety

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
						needsApprovalProp as (
							args: unknown,
						) => boolean | Promise<boolean>
					)(parsedArgs);
				} catch {
					// If evaluation fails, require approval for safety
					toolNeedsApproval = true;
				}
			}
		}
	}

	// Check if tool is bash (always needs approval even in auto-accept mode)
	const isBashTool = toolCall.function.name === 'execute_bash';

	// Request approval if needed
	if (
		toolNeedsApproval &&
		!(developmentMode === 'auto-accept' && !isBashTool)
	) {
		try {
			const approved = await approvalRegistry.request(toolCall, metadata);

			if (!approved) {
				// User rejected - return cancellation result
				return {
					tool_call_id: toolCall.id,
					role: 'tool' as const,
					name: toolCall.function.name,
					content: 'Tool execution cancelled by user',
				};
			}
		} catch (error) {
			// Approval was cancelled or errored
			return {
				tool_call_id: toolCall.id,
				role: 'tool' as const,
				name: toolCall.function.name,
				content: `Tool execution cancelled: ${error instanceof Error ? error.message : 'Unknown error'}`,
			};
		}
	}

	// Execute the tool
	try {
		const result = await processToolUse(toolCall, {
			onProgress,
		});
		return result;
	} catch (error) {
		return {
			tool_call_id: toolCall.id,
			role: 'tool' as const,
			name: toolCall.function.name,
			content: `Error executing tool: ${error instanceof Error ? error.message : 'Unknown error'}`,
		};
	}
}
