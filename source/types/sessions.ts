/**
 * Type definitions for coding sessions
 */

export type SessionStatus = 'active' | 'detached' | 'completed' | 'error';

export interface CodingSession {
	id: string; // UUID
	tmuxSessionName: string; // e.g., "task-42-abcde"
	agentName: string; // "claude-code", "cursor", etc.
	taskNumber?: number; // Linked task number
	taskDescription: string; // What's being worked on
	status: SessionStatus;
	startedAt: string; // ISO timestamp
	lastActivity?: string; // ISO timestamp
	agentSessionId?: string; // Agent's internal session ID (if supported)
	workingDirectory: string;
	worktreePath?: string; // Git worktree path (if created)
	branchName?: string; // Git branch name for the worktree
}

export interface TaskContext {
	taskDescription: string;
	taskNumber?: number;
	prompt?: string; // System prompt or context to pass to agent
	relatedPRs?: string[];
	relatedIssues?: string[];
	memoryContext?: string;
}
