/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/require-await */
/**
 * Explore subagent tool
 * Delegates exploration tasks to a specialized subagent
 */

import React from 'react';
import {Box, Text} from 'ink';
import {tool, jsonSchema} from '@/types/core';
import type {
	CoreToolExport,
	AISDKCoreTool,
	ToolExecutionOptions,
	ToolProgressUpdate,
} from '@/types/index';
import {readFileSync, existsSync} from 'fs';
import {join, dirname} from 'path';
import {createLLMClient} from '@/client-factory';
import type {Message} from '@/types/core';
import {fileURLToPath} from 'url';
import {useTheme} from '@/hooks/useTheme';

import {nativeToolsRegistry} from '../index';
import {progressRegistry} from '@/utils/progress-registry';
import {executeToolsWithApproval} from '@/utils/agent-tool-executor';

/**
 * Load the explore mode prompt
 */
function loadExplorePrompt(): string {
	// When running from dist/, we need to go back to source/
	// dist/tools/definitions/explore-subagent.js -> source/app/prompts/agent-modes/explore-mode.md
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = dirname(__filename);

	// Try dist path first (won't exist), then source path
	let promptPath = join(
		__dirname,
		'../../app/prompts/agent-modes/explore-mode.md',
	);

	// If not found in dist, look in source
	if (!existsSync(promptPath)) {
		// From dist/tools/definitions -> go to source/app/prompts/agent-modes
		promptPath = join(
			__dirname,
			'../../../source/app/prompts/agent-modes/explore-mode.md',
		);
	}

	return readFileSync(promptPath, 'utf-8');
}

// ==================== EXPLORE SUBAGENT ====================

const exploreSubagentCoreTool = tool({
	description:
		'Delegate a question or exploration task to a specialized subagent that will thoroughly search memory, integrations, and tasks to gather comprehensive context before providing an answer',
	inputSchema: jsonSchema<{
		query: string;
		context?: string;
	}>({
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description:
					'The question or task to explore. Be specific about what information you need.',
			},
			context: {
				type: 'string',
				description:
					'Optional additional context to help the subagent understand what to explore',
			},
		},
		required: ['query'],
	}),
	needsApproval: false, // Exploration is read-only, no approval needed
	execute: async (args, aiOptions) => {
		// Extract options from AI SDK options
		const onProgress = (aiOptions as any)?.onProgress;
		const toolCallId = (aiOptions as any)?.toolCallId;
		return await executeExploreSubagent(args, {
			onProgress,
			toolCallId,
		});
	},
});

interface ToolCallRecord {
	name: string;
	args: Record<string, unknown>;
	result?: string;
}

const executeExploreSubagent = async (
	args: {
		query: string;
		context?: string;
	},
	options?: ToolExecutionOptions,
): Promise<string> => {
	try {
		// Load explore mode prompt
		const explorePrompt = loadExplorePrompt();

		// Create the LLM client
		const {client} = await createLLMClient();

		// Define read-only (non-destructive) tools that the explore subagent can use
		const readOnlyToolNames = [
			'list_tasks',
			'search_tasks',
			'list_coding_sessions',
			// MCP memory tools (all read-only)
			'memory_search',
			'memory_about_user',
			'get_labels',
			'get_documents',
			'get_document',
			// MCP integration tools (read-only query actions)
			'get_integrations',
			'get_integration_actions',
			'execute_integration_action', // Will warn in prompt to only use read actions
			// Web search (read-only)
			'web_search',
		];

		// Build tools registry - just pass through
		// Tools with needsApproval: false → AI SDK auto-executes
		// Tools with needsApproval: true → AI SDK returns in message.tool_calls (we handle manually)
		const toolsForSubagent: Record<string, AISDKCoreTool> = {};

		for (const toolName of readOnlyToolNames) {
			const tool = nativeToolsRegistry[toolName];
			if (tool) {
				toolsForSubagent[toolName] = tool;
			}
		}

		// Build messages for the subagent
		let messages: Message[] = [
			{
				role: 'system',
				content: explorePrompt,
			},
			{
				role: 'user',
				content: args.context
					? `${args.query}\n\nAdditional context: ${args.context}`
					: args.query,
			},
		];

		// Track tool calls made by the subagent
		const toolCallsExecuted: ToolCallRecord[] = [];

		// Get progress reporter from registry if we have a toolCallId
		let progressReporter: ((update: ToolProgressUpdate) => void) | null = null;
		if (options?.toolCallId) {
			progressReporter = progressRegistry.getProgressReporter(
				options.toolCallId,
			);
		}

		// Emit initial status
		const reportProgress = progressReporter || options?.onProgress;
		reportProgress?.({
			type: 'status',
			data: {status: 'started', query: args.query},
			timestamp: Date.now(),
		});

		// Tool execution loop (like main agent)
		let fullResponse = '';
		let continueLoop = true;
		let loopCount = 0;
		const maxLoops = 10;

		while (continueLoop && loopCount < maxLoops) {
			loopCount++;

			// Call the LLM with tools
			const response = await client.chat(
				messages,
				toolsForSubagent,
				{
					onToken: (token: string) => {
						fullResponse += token;
					},
					onToolExecuted: (toolCall, result) => {
						// Update the tool call record with the result
						const record = toolCallsExecuted.find(
							tc =>
								tc.name === toolCall.function.name &&
								!tc.result &&
								JSON.stringify(tc.args) ===
									JSON.stringify(toolCall.function.arguments),
						);
						if (record) {
							record.result = result;
						}

						// Emit progress update - tool execution completed
						reportProgress?.({
							type: 'tool_result',
							data: {
								name: toolCall.function.name,
								result: result,
							},
							timestamp: Date.now(),
						});
					},
				},
				undefined, // No abort signal
			);

			// Extract the final response
			const finalMessage = response.choices[0]?.message;
			if (!finalMessage) {
				break;
			}

			// Check if there are tool_calls that need approval
			// (AI SDK returns these instead of auto-executing when needsApproval: true)
			const toolCallsNeedingApproval = finalMessage.tool_calls || [];

			if (toolCallsNeedingApproval.length > 0) {
				// Execute tools with approval
				const toolResults = await executeToolsWithApproval({
					toolCalls: toolCallsNeedingApproval,
					metadata: {
						source: 'subagent',
						subagentType: 'explore_subagent',
						chain: ['main', 'explore_subagent'],
					},
					developmentMode: 'normal',
					nonInteractiveMode: false,
					onToolExecuted: (toolCall, result) => {
						reportProgress?.({
							type: 'tool_result',
							data: {
								name: toolCall.function.name,
								result: result,
							},
							timestamp: Date.now(),
						});
					},
				});

				// Check if user cancelled any tool (pressed Escape)
				const wasCancelled = toolResults.some(
					result =>
						result.content === 'Tool execution cancelled by user' ||
						result.content?.startsWith('Tool execution cancelled:'),
				);

				if (wasCancelled) {
					// User pressed Escape - cancel entire subagent flow and return to main
					reportProgress?.({
						type: 'status',
						data: {status: 'cancelled'},
						timestamp: Date.now(),
					});

					return JSON.stringify({
						findings: 'Exploration cancelled by user',
						toolCalls: toolCallsExecuted,
						cancelled: true,
					});
				}

				// Add assistant message + tool results to conversation
				// Continue the loop so subagent can process the results
				const assistantMsg: Message = {
					role: 'assistant',
					content: finalMessage.content || '',
					tool_calls: toolCallsNeedingApproval,
				};

				const toolMessages: Message[] = toolResults.map(result => ({
					role: 'tool' as const,
					content: result.content || '',
					tool_call_id: result.tool_call_id,
					name: result.name,
				}));

				messages = [...messages, assistantMsg, ...toolMessages];
				// Loop continues - subagent processes tool results
			} else {
				// No more tool calls - we're done
				fullResponse = finalMessage.content || fullResponse;
				continueLoop = false;
			}
		}

		// Emit completion status
		reportProgress?.({
			type: 'status',
			data: {status: 'completed'},
			timestamp: Date.now(),
		});

		// Return structured result with both findings and tool calls
		const result = {
			findings: fullResponse || 'No findings to report',
			toolCalls: toolCallsExecuted,
		};

		return JSON.stringify(result);
	} catch (error) {
		return JSON.stringify({
			error: `Subagent exploration failed: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`,
			toolCalls: [],
		});
	}
};

// Progressive display for tool execution indicator (shows real-time updates)
function ExploreSubagentLoadingDisplay({
	args,
	updates,
}: {
	args: {query: string; context?: string};
	updates: ToolProgressUpdate[];
}) {
	const {colors} = useTheme();

	// Parse updates to extract tool results and status
	const toolResults: Array<{name: string; result: string}> = [];
	let status = 'starting';

	for (const update of updates) {
		if (update.type === 'tool_result') {
			toolResults.push({
				name: update.data.name,
				result: update.data.result,
			});
		} else if (update.type === 'status') {
			status = update.data.status;
		}
	}

	// Get the last tool result
	const lastToolResult =
		toolResults.length > 0 ? toolResults[toolResults.length - 1] : null;

	// Helper to truncate long results
	const truncateResult = (result: string, maxLength = 80): string => {
		if (typeof result !== 'string') {
			result = JSON.stringify(result);
		}
		return result.length > maxLength
			? result.substring(0, maxLength) + '...'
			: result;
	};

	return (
		<Box flexDirection="column">
			<Text color={colors.tool}>Exploring:</Text>
			<Text color={colors.white}> └ {args.query}</Text>

			{/* Show tool results as they happen */}
			{toolResults.length > 0 ? (
				<Box flexDirection="column" marginLeft={4}>
					{lastToolResult && (
						<Box flexDirection="row">
							<Text color={colors.success} dimColor>
								✓{' '}
							</Text>
							<Text color={colors.white} dimColor>
								{lastToolResult.name}
							</Text>
						</Box>
					)}
				</Box>
			) : (
				<Text color={colors.white} dimColor>
					└{' '}
					{status === 'started'
						? 'Starting exploration...'
						: status === 'cancelled'
							? 'Cancelled by user'
							: 'Searching memory, integrations, and tasks...'}
				</Text>
			)}

			{/* Show last tool result in text */}
			{lastToolResult && (
				<Box flexDirection="column" marginLeft={4} marginTop={1}>
					<Text color={colors.white} dimColor>
						Last tool: {lastToolResult.name}
					</Text>
					<Text color={colors.white} dimColor>
						Result: {truncateResult(lastToolResult.result || '')}
					</Text>
				</Box>
			)}
		</Box>
	);
}

// React component to display exploration results (final)
function ExploreSubagentResult({
	args,
	result,
}: {
	args: {query: string; context?: string};
	result?: string;
}) {
	const {colors} = useTheme();

	if (!result) {
		return (
			<Box flexDirection="column">
				<Text color={colors.white}>● explore_subagent</Text>
				<Text color={colors.white}> └ Query: {args.query}</Text>
			</Box>
		);
	}

	let parsed: {
		findings?: string;
		error?: string;
		toolCalls: ToolCallRecord[];
		cancelled?: boolean;
	};

	try {
		parsed = JSON.parse(result);
	} catch {
		return (
			<Box flexDirection="column">
				<Text color={colors.white}>● explore_subagent</Text>
				<Text color={colors.white}> └ Query: {args.query}</Text>
				<Text color={colors.error}> └ Error parsing result</Text>
			</Box>
		);
	}

	// Summary line for findings
	const findingsSummary = parsed.findings
		? parsed.findings.substring(0, 100) +
		  (parsed.findings.length > 100 ? '...' : '')
		: 'No findings';

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Text color={colors.white}>● explore_subagent</Text>
			<Text color={colors.white}> └ Query: {args.query}</Text>

			{/* Tool calls summary */}
			{parsed.toolCalls && parsed.toolCalls.length > 0 && (
				<Text color={colors.white} dimColor>
					└ Explored using {parsed.toolCalls.length} tool
					{parsed.toolCalls.length > 1 ? 's' : ''}
				</Text>
			)}

			{/* Collapsed findings or error */}
			{parsed.error ? (
				<Text color={colors.error}> └ Error: {parsed.error}</Text>
			) : parsed.cancelled ? (
				<Text color={colors.white} dimColor>
					{' '}
					└ {findingsSummary}
				</Text>
			) : (
				<Text color={colors.white} dimColor>
					{' '}
					└ {findingsSummary}
				</Text>
			)}
		</Box>
	);
}

const exploreSubagentFormatter = async (
	args: {query: string; context?: string},
	result?: string,
): Promise<React.ReactElement> => {
	return <ExploreSubagentResult args={args} result={result} />;
};

const exploreSubagentProgressFormatter = async (
	args: {query: string; context?: string},
	updates: ToolProgressUpdate[],
): Promise<React.ReactElement> => {
	return <ExploreSubagentLoadingDisplay args={args} updates={updates} />;
};

export const exploreSubagentTool: CoreToolExport = {
	name: 'explore_subagent',
	tool: exploreSubagentCoreTool,
	formatter: exploreSubagentFormatter,
	progressFormatter: exploreSubagentProgressFormatter,
};
