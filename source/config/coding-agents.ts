/**
 * Coding agent provider system
 * Defines built-in agent configurations for Claude Code, Cursor, Aider, etc.
 */

import type {CodingAgentConfig} from '@/types/coding-agents';

/**
 * Built-in coding agents with their default configurations
 */
export const CODING_AGENTS: Record<string, CodingAgentConfig> = {
	'claude-code': {
		name: 'claude-code',
		displayName: 'Claude Code',
		command: 'claude',
		supportsSessionId: true,
		supportsSystemPrompt: true,
		flags: {
			sessionId: '--session-id',
			systemPrompt: '--append-system-prompt',
			resume: '--resume',
		},
	},
	cursor: {
		name: 'cursor',
		displayName: 'Cursor AI',
		command: 'cursor',
		supportsSessionId: false,
		supportsSystemPrompt: false,
		flags: {
			workingDir: '--goto',
		},
	},
	aider: {
		name: 'aider',
		displayName: 'Aider',
		command: 'aider',
		supportsSessionId: false,
		supportsSystemPrompt: true,
		flags: {
			systemPrompt: '--message',
		},
	},
	codex: {
		name: 'codex',
		displayName: 'Codex CLI',
		command: 'codex',
		supportsSessionId: false,
		supportsSystemPrompt: false,
		flags: {},
	},
};

/**
 * Get agent configuration by name
 */
export function getAgentConfig(
	agentName: string,
): CodingAgentConfig | undefined {
	return CODING_AGENTS[agentName];
}

/**
 * Get list of all available agent names
 */
export function getAvailableAgents(): string[] {
	return Object.keys(CODING_AGENTS);
}

/**
 * Check if an agent is supported
 */
export function isAgentSupported(agentName: string): boolean {
	return agentName in CODING_AGENTS;
}
