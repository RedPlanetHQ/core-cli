/**
 * Type definitions for coding agent system
 */

export interface CodingAgentConfig {
	name: string; // "claude-code", "cursor", "aider", "codex"
	displayName: string; // "Claude Code", "Cursor AI", "Aider"
	command: string; // CLI command to launch
	supportsSessionId: boolean; // Can pass session ID?
	supportsSystemPrompt: boolean; // Can pass context via system prompt?
	flags: {
		sessionId?: string; // "--session-id"
		systemPrompt?: string; // "--append-system-prompt"
		resume?: string; // "--resume"
		workingDir?: string; // "--working-dir"
	};
}

export interface CodingAgentUserConfig {
	enabled: boolean;
	path?: string; // Custom path to the agent binary
}

export interface CodingAgentsConfig {
	defaultCodingAgent?: string;
	codingAgents?: {
		[agentName: string]: CodingAgentUserConfig;
	};
}
