import type {Tokenizer} from '../../types';
import type {Message} from '@/types/core';

/**
 * Fallback tokenizer for unsupported models
 * Uses a simple character-based estimation (4 chars per token)
 */
export class FallbackTokenizer implements Tokenizer {
	private readonly CHARS_PER_TOKEN = 4;

	encode(text: string): number {
		return Math.ceil(text.length / this.CHARS_PER_TOKEN);
	}

	countTokens(message: Message): number {
		const content = message.content || '';
		const role = message.role || '';

		// Count tokens for content + a small overhead for role and formatting
		return this.encode(content) + Math.ceil(role.length / this.CHARS_PER_TOKEN);
	}

	getName(): string {
		return 'fallback';
	}
}
