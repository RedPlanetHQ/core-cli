/* eslint-disable @typescript-eslint/require-await */
/**
 * Coding session tools
 * Tools for managing coding agent sessions
 */

import {tool, jsonSchema} from '@/types/core';
import type {CoreToolExport} from '@/types/index';
import {
	createSession,
	saveSession,
	getActiveSessions,
	getSessionsForTask,
	deleteSession,
	findSession,
	loadAllSessions,
} from '@/utils/coding-sessions';
import {triggerStatusBarRefresh} from '@/utils/status-bar-events';
import {
	launchCodingAgent,
	killTmuxSession,
	isTmuxInstalled,
	isAgentInstalled,
	tmuxSessionExists,
} from '@/utils/tmux-manager';
import {getAgentConfig} from '@/config/coding-agents';
import {getConfig} from '@/config';
import {readWeekTasks} from '@/utils/tasks';
import type {TaskContext} from '@/types/sessions';

// ==================== LAUNCH CODING SESSION ====================

const launchCodingSessionCoreTool = tool({
	description:
		'Launch a coding agent (Claude Code, Cursor, Aider, etc.) in a detached tmux session for implementation work',
	inputSchema: jsonSchema<{
		taskNumber?: number;
		taskDescription: string;
		agentName?: string;
		workingDirectory: string;
		useWorktree?: boolean;
	}>({
		type: 'object',
		properties: {
			taskNumber: {
				type: 'number',
				description: 'Optional task number to associate with this session',
			},
			taskDescription: {
				type: 'string',
				description: 'Description of what needs to be implemented or worked on',
			},
			agentName: {
				type: 'string',
				description:
					'Name of coding agent to use (claude-code, cursor, aider, codex). If not specified, uses default from config.',
			},
			workingDirectory: {
				type: 'string',
				description:
					'Absolute path to the directory where the coding agent should work',
			},
			useWorktree: {
				type: 'boolean',
				description:
					'Whether to create a git worktree for this session (default: true). If true, a separate git worktree will be created for isolated work.',
			},
		},
		required: ['taskDescription', 'workingDirectory'],
	}),
	// High risk: bash commands always require approval in all modes
	needsApproval: true,
	execute: async (args, _options) => {
		return await executeLaunchCodingSession(args);
	},
});

const executeLaunchCodingSession = async (args: {
	taskNumber?: number;
	taskDescription: string;
	agentName?: string;
	workingDirectory: string;
	useWorktree?: boolean;
}): Promise<string> => {
	// Check tmux
	if (!isTmuxInstalled()) {
		return 'ERROR: tmux is not installed. Please install tmux first.';
	}

	// Get config
	const config = getConfig();
	const agentName =
		args.agentName ?? config.defaultCodingAgent ?? 'claude-code';

	// Get agent config
	const agentConfig = getAgentConfig(agentName);
	if (!agentConfig) {
		return `ERROR: Unknown agent: ${agentName}`;
	}

	// Check if agent is installed
	const customPath = config.codingAgents?.[agentName]?.path;
	if (!isAgentInstalled(agentConfig, customPath)) {
		const cmd = customPath ?? agentConfig.command;
		return `ERROR: ${agentConfig.displayName} is not installed (${cmd} not found)`;
	}

	// Validate task number if provided
	if (args.taskNumber) {
		const tasks = await readWeekTasks();
		const task = tasks.find(t => t.number === args.taskNumber);
		if (!task) {
			return `ERROR: Task #${args.taskNumber} not found`;
		}
	}

	// Default useWorktree to true if not specified
	const useWorktree = args.useWorktree ?? true;

	// Create session
	const session = createSession(
		agentName,
		args.taskNumber,
		args.taskDescription,
		args.workingDirectory,
		useWorktree,
	);

	// Build task description for context
	let taskDescriptionWithContext = args.taskDescription;

	// Build context prompt
	let contextPrompt = '';
	if (useWorktree && session.worktreePath) {
		const worktreeNote =
			'\n\nIMPORTANT: You are working in a git worktree. You need to commit the changes before finishing.';
		taskDescriptionWithContext += worktreeNote;
		contextPrompt += worktreeNote;
	}

	// Build context
	const context: TaskContext = {
		taskDescription: taskDescriptionWithContext,
		taskNumber: args.taskNumber,
		prompt: contextPrompt || undefined,
	};

	try {
		// Launch the agent
		await launchCodingAgent(session, context, customPath);

		// Update session status
		session.status = 'detached';
		saveSession(session);

		// Trigger status bar refresh
		triggerStatusBarRefresh();

		const attachCmd = args.taskNumber
			? `core-cli attach task-${args.taskNumber}`
			: `core-cli attach ${session.tmuxSessionName}`;

		return `SUCCESS: Launched ${agentConfig.displayName} in background session "${session.tmuxSessionName}"\n\nTo attach to this session, run: ${attachCmd}\n\nPress Ctrl+B then D to detach from the session when you're done.`;
	} catch (error) {
		deleteSession(session.id);
		return `ERROR: Failed to launch agent: ${
			error instanceof Error ? error.message : 'Unknown error'
		}`;
	}
};

const launchCodingSessionFormatter = async (
	args: {
		taskNumber?: number;
		taskDescription: string;
		agentName?: string;
		workingDirectory: string;
		useWorktree?: boolean;
	},
	result?: string,
): Promise<string> => {
	const lines: string[] = ['⚡ launch_coding_session'];
	if (args.taskNumber) {
		lines.push(`└ Task: #${args.taskNumber}`);
	}
	lines.push(`  Description: ${args.taskDescription}`);
	lines.push(`  Working Directory: ${args.workingDirectory}`);
	if (args.agentName) {
		lines.push(`  Agent: ${args.agentName}`);
	}
	const useWorktree = args.useWorktree ?? true;
	lines.push(`  Use Worktree: ${useWorktree ? 'yes' : 'no'}`);

	if (result) {
		lines.push('');
		lines.push(result);
	}

	return lines.join('\n');
};

export const launchCodingSessionTool: CoreToolExport = {
	name: 'launch_coding_session',
	tool: launchCodingSessionCoreTool,
	formatter: launchCodingSessionFormatter,
};

// ==================== LIST CODING SESSIONS ====================

const listCodingSessionsCoreTool = tool({
	description: 'List all active coding agent sessions',
	inputSchema: jsonSchema<{
		taskNumber?: number;
	}>({
		type: 'object',
		properties: {
			taskNumber: {
				type: 'number',
				description:
					'Optional task number to filter sessions for a specific task',
			},
		},
	}),
	needsApproval: false,
	execute: async (args, _options) => {
		return await executeListCodingSessions(args);
	},
});

const executeListCodingSessions = async (args: {
	taskNumber?: number;
}): Promise<string> => {
	// Always validate tmux sessions when listing
	const sessions = args.taskNumber
		? getSessionsForTask(args.taskNumber)
		: getActiveSessions(true);

	if (sessions.length === 0) {
		return 'No active coding sessions found.';
	}

	const lines: string[] = [];
	for (const session of sessions) {
		const taskInfo = session.taskNumber ? `Task #${session.taskNumber}: ` : '';
		const attachCmd = session.taskNumber
			? `core-cli attach task-${session.taskNumber}`
			: `core-cli attach ${session.tmuxSessionName}`;

		lines.push(`[${session.agentName}] ${taskInfo}${session.taskDescription}`);
		lines.push(`  Session: ${session.tmuxSessionName}`);
		lines.push(`  Status: ${session.status}`);
		lines.push(`  Started: ${session.startedAt}`);
		lines.push(`  Attach: ${attachCmd}`);
		lines.push('');
	}

	return lines.join('\n');
};

const listCodingSessionsFormatter = async (
	_args: {taskNumber?: number},
	result?: string,
): Promise<string> => {
	const lines: string[] = ['💻 list_coding_sessions'];
	if (result) {
		lines.push('');
		lines.push(result);
	}
	return lines.join('\n');
};

export const listCodingSessionsTool: CoreToolExport = {
	name: 'list_coding_sessions',
	tool: listCodingSessionsCoreTool,
	formatter: listCodingSessionsFormatter,
};

// ==================== CLOSE CODING SESSION ====================

const closeCodingSessionCoreTool = tool({
	description:
		'Close a coding session by task number or session name, killing the tmux session',
	inputSchema: jsonSchema<{
		identifier: string;
	}>({
		type: 'object',
		properties: {
			identifier: {
				type: 'string',
				description:
					'Task number (e.g., "42" or "task-42") or tmux session name',
			},
		},
		required: ['identifier'],
	}),
	needsApproval: true,
	execute: async (args, _options) => {
		return await executeCloseCodingSession(args);
	},
});

const executeCloseCodingSession = async (args: {
	identifier: string;
}): Promise<string> => {
	const session = findSession(args.identifier);

	if (!session) {
		return `ERROR: Session not found: ${args.identifier}`;
	}

	try {
		// Kill the tmux session
		killTmuxSession(session.tmuxSessionName);

		// Update session status
		session.status = 'completed';
		saveSession(session);

		// Trigger status bar refresh
		triggerStatusBarRefresh();

		return `SUCCESS: Closed session "${session.tmuxSessionName}"`;
	} catch (error) {
		return `ERROR: Failed to close session: ${
			error instanceof Error ? error.message : 'Unknown error'
		}`;
	}
};

const closeCodingSessionFormatter = async (
	args: {identifier: string},
	result?: string,
): Promise<string> => {
	const lines: string[] = ['🛑 close_coding_session'];
	lines.push(`└ Identifier: ${args.identifier}`);

	if (result) {
		lines.push('');
		lines.push(result);
	}

	return lines.join('\n');
};

export const closeCodingSessionTool: CoreToolExport = {
	name: 'close_coding_session',
	tool: closeCodingSessionCoreTool,
	formatter: closeCodingSessionFormatter,
};

// ==================== DELETE CODING SESSION ====================

const deleteCodingSessionCoreTool = tool({
	description:
		'Delete a coding session permanently, including tmux session and worktree cleanup',
	inputSchema: jsonSchema<{
		identifier: string;
	}>({
		type: 'object',
		properties: {
			identifier: {
				type: 'string',
				description: 'Session name (e.g., "task-42-abcde") to delete',
			},
		},
		required: ['identifier'],
	}),
	needsApproval: true,
	execute: async (args, _options) => {
		return await executeDeleteCodingSession(args);
	},
});

const executeDeleteCodingSession = async (args: {
	identifier: string;
}): Promise<string> => {
	const session = findSession(args.identifier);

	if (!session) {
		return `ERROR: Session not found: ${args.identifier}`;
	}

	try {
		// Kill the tmux session if running
		if (tmuxSessionExists(session.tmuxSessionName)) {
			killTmuxSession(session.tmuxSessionName);
		}

		const worktreePath = session.worktreePath;

		// Delete the session (also cleans up worktree)
		deleteSession(session.id);

		// Trigger status bar refresh
		triggerStatusBarRefresh();

		let message = `SUCCESS: Deleted session "${session.tmuxSessionName}"`;
		if (worktreePath) {
			message += `\nCleaned up worktree: ${worktreePath}`;
		}

		return message;
	} catch (error) {
		return `ERROR: Failed to delete session: ${
			error instanceof Error ? error.message : 'Unknown error'
		}`;
	}
};

const deleteCodingSessionFormatter = async (
	args: {identifier: string},
	result?: string,
): Promise<string> => {
	const lines: string[] = ['🗑️  delete_coding_session'];
	lines.push(`└ Identifier: ${args.identifier}`);

	if (result) {
		lines.push('');
		lines.push(result);
	}

	return lines.join('\n');
};

export const deleteCodingSessionTool: CoreToolExport = {
	name: 'delete_coding_session',
	tool: deleteCodingSessionCoreTool,
	formatter: deleteCodingSessionFormatter,
};

// ==================== CLEAR ALL CODING SESSIONS ====================

const clearCodingSessionsCoreTool = tool({
	description:
		'Clear all coding sessions, killing all tmux sessions and cleaning up all worktrees',
	inputSchema: jsonSchema<Record<string, never>>({
		type: 'object',
		properties: {},
	}),
	needsApproval: true,
	execute: async (_args, _options) => {
		return await executeClearCodingSessions();
	},
});

const executeClearCodingSessions = async (): Promise<string> => {
	const sessions = loadAllSessions();

	if (sessions.length === 0) {
		return 'No sessions to clear.';
	}

	try {
		let deletedCount = 0;
		let worktreeCount = 0;

		for (const session of sessions) {
			// Kill tmux session if running
			if (tmuxSessionExists(session.tmuxSessionName)) {
				killTmuxSession(session.tmuxSessionName);
			}

			// Track worktrees
			if (session.worktreePath) {
				worktreeCount++;
			}

			// Delete the session
			deleteSession(session.id);
			deletedCount++;
		}

		// Trigger status bar refresh
		triggerStatusBarRefresh();

		let message = `SUCCESS: Cleared ${deletedCount} session${
			deletedCount !== 1 ? 's' : ''
		}`;
		if (worktreeCount > 0) {
			message += `\nCleaned up ${worktreeCount} worktree${
				worktreeCount !== 1 ? 's' : ''
			}`;
		}

		return message;
	} catch (error) {
		return `ERROR: Failed to clear sessions: ${
			error instanceof Error ? error.message : 'Unknown error'
		}`;
	}
};

const clearCodingSessionsFormatter = async (
	_args: Record<string, never>,
	result?: string,
): Promise<string> => {
	const lines: string[] = ['🧹 clear_coding_sessions'];

	if (result) {
		lines.push('');
		lines.push(result);
	}

	return lines.join('\n');
};

export const clearCodingSessionsTool: CoreToolExport = {
	name: 'clear_coding_sessions',
	tool: clearCodingSessionsCoreTool,
	formatter: clearCodingSessionsFormatter,
};
