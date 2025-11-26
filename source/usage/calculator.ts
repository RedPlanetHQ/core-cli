/**
 * Usage calculator
 * Calculates token breakdown by category
 */

import type {Message} from '@/types/core';
import type {Tokenizer} from '@/types/tokenization';
import type {TokenBreakdown} from '../types/usage';

/**
 * Calculate token breakdown from messages
 * @param messages - Messages to calculate breakdown for
 * @param tokenizer - Tokenizer instance (used as fallback if getTokens not provided)
 * @param getTokens - Optional cached token counting function for performance
 */
export function calculateTokenBreakdown(
	messages: Message[],
	tokenizer: Tokenizer,
	getTokens?: (message: Message) => number,
): TokenBreakdown {
	const breakdown: TokenBreakdown = {
		system: 0,
		userMessages: 0,
		assistantMessages: 0,
		toolDefinitions: 0,
		toolResults: 0,
		total: 0,
	};

	for (const message of messages) {
		const tokens = getTokens
			? getTokens(message)
			: tokenizer.countTokens(message);

		switch (message.role) {
			case 'system':
				breakdown.system += tokens;
				break;

			case 'user':
				breakdown.userMessages += tokens;
				break;

			case 'assistant':
				breakdown.assistantMessages += tokens;
				break;

			case 'tool':
				breakdown.toolResults += tokens;
				break;

			default:
				// Unknown roles go to assistant messages
				breakdown.assistantMessages += tokens;
		}
	}

	// Calculate total
	breakdown.total =
		breakdown.system +
		breakdown.userMessages +
		breakdown.assistantMessages +
		breakdown.toolDefinitions +
		breakdown.toolResults;

	return breakdown;
}

/**
 * Calculate tool definitions token count
 * This estimates the tokens used by tool definitions sent to the model
 */
export function calculateToolDefinitionsTokens(toolCount: number): number {
	// Rough estimate: each tool definition is about 150 tokens
	// This includes name, description, parameters schema
	const TOKENS_PER_TOOL = 150;

	return toolCount * TOKENS_PER_TOOL;
}

/**
 * Get status color based on percentage used
 */
export function getUsageStatusColor(
	percentUsed: number,
): 'success' | 'warning' | 'error' {
	if (percentUsed < 70) {
		return 'success';
	} else if (percentUsed < 90) {
		return 'warning';
	} else {
		return 'error';
	}
}

/**
 * Format token count with thousands separator
 */
export function formatTokenCount(tokens: number): string {
	return tokens.toLocaleString();
}
