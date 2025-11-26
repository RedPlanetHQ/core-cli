/**
 * Usage tracker
 * Tracks current session usage
 */

import type {Message} from '@/types/core';
import type {Tokenizer} from '@/types/tokenization';
import {calculateTokenBreakdown} from './calculator';
import {addSession} from './storage';
import {getModelContextLimit} from '@/models/index';
import type {SessionUsage, CurrentSessionStats} from '../types/usage';

export class SessionTracker {
	private sessionId: string;
	private startTime: number;
	private provider: string;
	private model: string;

	constructor(provider: string, model: string) {
		this.sessionId = this.generateSessionId();
		this.startTime = Date.now();
		this.provider = provider;
		this.model = model;
	}

	private generateSessionId(): string {
		return crypto.randomUUID();
	}

	async getCurrentStats(
		messages: Message[],
		tokenizer: Tokenizer,
	): Promise<CurrentSessionStats> {
		const breakdown = calculateTokenBreakdown(messages, tokenizer);
		const contextLimit = await getModelContextLimit(this.model);
		const percentUsed = contextLimit
			? (breakdown.total / contextLimit) * 100
			: 0;

		return {
			tokens: breakdown,
			messageCount: messages.length,
			startTime: this.startTime,
			provider: this.provider,
			model: this.model,
			contextLimit,
			percentUsed,
		};
	}

	saveSession(messages: Message[], tokenizer: Tokenizer): void {
		const breakdown = calculateTokenBreakdown(messages, tokenizer);
		const duration = Date.now() - this.startTime;

		const session: SessionUsage = {
			id: this.sessionId,
			timestamp: this.startTime,
			provider: this.provider,
			model: this.model,
			tokens: breakdown,
			messageCount: messages.length,
			duration,
		};

		addSession(session);
	}

	updateProviderModel(provider: string, model: string): void {
		this.provider = provider;
		this.model = model;
	}

	getSessionInfo(): {
		id: string;
		startTime: number;
		provider: string;
		model: string;
	} {
		return {
			id: this.sessionId,
			startTime: this.startTime,
			provider: this.provider,
			model: this.model,
		};
	}
}

let currentSessionTracker: SessionTracker | null = null;

export function initializeSession(provider: string, model: string): void {
	currentSessionTracker = new SessionTracker(provider, model);
}

export function getCurrentSession(): SessionTracker | null {
	return currentSessionTracker;
}

export function clearCurrentSession(): void {
	currentSessionTracker = null;
}
