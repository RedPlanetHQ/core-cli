/**
 * Type definitions for coding sessions
 */

export type SessionStatus = 'active' | 'detached' | 'completed' | 'error';

export interface CodingSession {
	id: string; // UUID
	tmuxSessionName: string; // e.g., "core-coding-task-42-a1b2"
	agentName: string; // "claude-code", "cursor", etc.
	taskNumber?: number; // Linked task number
	taskDescription: string; // What's being worked on
	status: SessionStatus;
	startedAt: string; // ISO timestamp
	lastActivity?: string; // ISO timestamp
	agentSessionId?: string; // Agent's internal session ID (if supported)
	workingDirectory: string;
	contextProvided: string; // Summary of context passed to agent
}

export interface TaskContext {
	taskDescription: string;
	taskNumber?: number;
	prompt?: string; // System prompt or context to pass to agent
	relatedPRs?: string[];
	relatedIssues?: string[];
	memoryContext?: string;
}
