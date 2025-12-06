/**
 * Tmux session manager for coding agents
 * Handles spawning and attaching to tmux sessions
 */

import {execSync, spawn} from 'child_process';
import {existsSync} from 'fs';
import type {CodingAgentConfig} from '@/types/coding-agents';
import type {CodingSession, TaskContext} from '@/types/sessions';
import {getAgentConfig} from '@/config/coding-agents';

/**
 * Check if tmux is installed
 */
export function isTmuxInstalled(): boolean {
	try {
		execSync('which tmux', {stdio: 'ignore'});
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if a tmux session exists
 */
export function tmuxSessionExists(sessionName: string): boolean {
	try {
		execSync(`tmux has-session -t ${sessionName}`, {stdio: 'ignore'});
		return true;
	} catch {
		return false;
	}
}

/**
 * List all tmux sessions
 */
export function listTmuxSessions(): string[] {
	try {
		const output = execSync('tmux list-sessions -F "#{session_name}"', {
			encoding: 'utf-8',
		});
		return output.trim().split('\n').filter(Boolean);
	} catch {
		return [];
	}
}

/**
 * Check if agent command is installed
 */
export function isAgentInstalled(
	agentConfig: CodingAgentConfig,
	customPath?: string,
): boolean {
	const command = customPath ?? agentConfig.command;
	try {
		execSync(`which ${command}`, {stdio: 'ignore'});
		return true;
	} catch {
		// If which fails, try checking if the path exists directly
		if (customPath && existsSync(customPath)) {
			return true;
		}
		return false;
	}
}

/**
 * Build command for launching coding agent
 */
export function buildAgentCommand(
	agentConfig: CodingAgentConfig,
	session: CodingSession,
	context: TaskContext,
	customPath?: string,
): string {
	const cmdParts: string[] = [customPath ?? agentConfig.command];

	// Add session ID if supported
	if (agentConfig.supportsSessionId && session.agentSessionId) {
		cmdParts.push(agentConfig.flags.sessionId!, session.agentSessionId);
	}

	// Add system prompt if supported
	if (agentConfig.supportsSystemPrompt && context.prompt) {
		// Escape single quotes in the prompt
		const escapedPrompt = context.prompt.replace(/'/g, "'\\''");
		cmdParts.push(agentConfig.flags.systemPrompt!, `'${escapedPrompt}'`);
	}

	// Add working directory if supported
	if (agentConfig.flags.workingDir) {
		cmdParts.push(
			agentConfig.flags.workingDir,
			session.workingDirectory,
		);
	}

	// Add initial message/task description
	const escapedDescription = context.taskDescription.replace(/'/g, "'\\''");
	cmdParts.push(`'${escapedDescription}'`);

	return cmdParts.join(' ');
}

/**
 * Launch coding agent in detached tmux session
 */
export async function launchCodingAgent(
	session: CodingSession,
	context: TaskContext,
	customPath?: string,
): Promise<void> {
	const agentConfig = getAgentConfig(session.agentName);
	if (!agentConfig) {
		throw new Error(`Unknown agent: ${session.agentName}`);
	}

	if (!isTmuxInstalled()) {
		throw new Error('tmux is not installed. Please install tmux first.');
	}

	if (!isAgentInstalled(agentConfig, customPath)) {
		const cmd = customPath ?? agentConfig.command;
		throw new Error(
			`Agent command not found: ${cmd}. Please install ${agentConfig.displayName} first.`,
		);
	}

	// Build the agent command
	const agentCommand = buildAgentCommand(
		agentConfig,
		session,
		context,
		customPath,
	);

	// Create detached tmux session
	const tmuxCommand = `tmux new-session -d -s "${session.tmuxSessionName}" -c "${session.workingDirectory}" "${agentCommand}"`;

	return new Promise((resolve, reject) => {
		const child = spawn(tmuxCommand, {
			shell: true,
			stdio: 'ignore',
		});

		child.on('error', error => {
			reject(new Error(`Failed to launch agent: ${error.message}`));
		});

		child.on('exit', code => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Agent launch failed with code ${code}`));
			}
		});

		// Give it a moment to start
		setTimeout(() => {
			if (tmuxSessionExists(session.tmuxSessionName)) {
				resolve();
			}
		}, 500);
	});
}

/**
 * Attach to a tmux session
 */
export function attachToSession(sessionName: string): void {
	if (!tmuxSessionExists(sessionName)) {
		throw new Error(`Session does not exist: ${sessionName}`);
	}

	// Attach to the session
	execSync(`tmux attach -t ${sessionName}`, {stdio: 'inherit'});
}

/**
 * Kill a tmux session
 */
export function killTmuxSession(sessionName: string): void {
	try {
		execSync(`tmux kill-session -t ${sessionName}`, {stdio: 'ignore'});
	} catch {
		// Session might not exist, ignore error
	}
}
