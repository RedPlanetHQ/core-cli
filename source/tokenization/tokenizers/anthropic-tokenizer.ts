/**
 * Anthropic tokenizer for Claude models
 * Uses @anthropic-ai/tokenizer package
 */

import {countTokens as anthropicCountTokens} from '@anthropic-ai/tokenizer';
import type {Tokenizer} from '../../types';
import type {Message} from '@/types/core';

/**
 * Anthropic tokenizer for Claude models
 */
export class AnthropicTokenizer implements Tokenizer {
	private modelName: string;

	constructor(modelId?: string) {
		this.modelName = modelId || 'claude-3';
	}

	encode(text: string): number {
		try {
			return anthropicCountTokens(text);
		} catch {
			// Fallback to character-based estimation if tokenization fails
			return Math.ceil(text.length / 4);
		}
	}

	countTokens(message: Message): number {
		const content = message.content || '';
		const role = message.role || '';

		// Anthropic format includes role in the message structure
		// Approximate overhead for message formatting
		const messageOverhead = 3;

		return this.encode(content) + this.encode(role) + messageOverhead;
	}

	getName(): string {
		return `anthropic-${this.modelName}`;
	}
}
