/**
 * Coding session management layer
 * Handles CRUD operations for coding agent sessions
 */

import {
	existsSync,
	mkdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from 'fs';
import {join} from 'path';
import {randomUUID} from 'crypto';
import {execSync} from 'child_process';
import {getAppDataPath} from '@/config/paths';
import type {CodingSession, SessionStatus} from '@/types/sessions';
import {readdirSync} from 'fs';
import {tmuxSessionExists} from './tmux-manager';

const SESSIONS_DIR = join(getAppDataPath(), 'sessions');

/**
 * Ensure sessions directory exists
 */
function ensureSessionsDir(): void {
	if (!existsSync(SESSIONS_DIR)) {
		mkdirSync(SESSIONS_DIR, {recursive: true});
	}
}

/**
 * Get path to session file
 */
function getSessionPath(sessionId: string): string {
	return join(SESSIONS_DIR, `${sessionId}.json`);
}

/**
 * Generate a random 5-letter string
 */
function generateRandomString(length: number = 5): string {
	const chars = 'abcdefghijklmnopqrstuvwxyz';
	let result = '';
	for (let i = 0; i < length; i++) {
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}
	return result;
}

/**
 * Create a git worktree for the session
 */
function createWorktree(
	workingDirectory: string,
	branchName: string,
): string | null {
	try {
		// Check if we're in a git repository
		execSync('git rev-parse --git-dir', {
			cwd: workingDirectory,
			stdio: 'ignore',
		});

		// Get the git root directory
		const gitRoot = execSync('git rev-parse --show-toplevel', {
			cwd: workingDirectory,
			encoding: 'utf-8',
		}).trim();

		// Create worktree directory path
		const worktreePath = join(gitRoot, '..', 'worktrees', branchName);

		// Get current branch to base the worktree on
		const currentBranch = execSync('git branch --show-current', {
			cwd: workingDirectory,
			encoding: 'utf-8',
		}).trim();

		// Create the worktree with a new branch
		execSync(
			`git worktree add -b ${branchName} "${worktreePath}" ${
				currentBranch || 'HEAD'
			}`,
			{
				cwd: workingDirectory,
				stdio: 'ignore',
			},
		);

		return worktreePath;
	} catch (error) {
		// If worktree creation fails, log but don't throw
		// This allows sessions to work even without git or if worktree fails
		console.error('Failed to create worktree:', error);
		return null;
	}
}

/**
 * Create a new coding session
 */
export function createSession(
	agentName: string,
	taskNumber: number | undefined,
	taskDescription: string,
	workingDirectory: string,
	contextProvided: string,
): CodingSession {
	ensureSessionsDir();

	const sessionId = randomUUID();
	const randomSuffix = generateRandomString(5);
	const tmuxSessionName = taskNumber
		? `task-${taskNumber}-${randomSuffix}`
		: `core-coding-${randomSuffix}`;

	// Create git worktree with the same naming pattern
	const branchName = tmuxSessionName;
	const worktreePath = createWorktree(workingDirectory, branchName);

	// Use worktree path as working directory if created successfully
	const sessionWorkingDir = worktreePath || workingDirectory;

	const session: CodingSession = {
		id: sessionId,
		tmuxSessionName,
		agentName,
		taskNumber,
		taskDescription,
		status: 'active',
		startedAt: new Date().toISOString(),
		workingDirectory: sessionWorkingDir,
		worktreePath: worktreePath || undefined,
		branchName: worktreePath ? branchName : undefined,
		contextProvided,
	};

	saveSession(session);
	return session;
}

/**
 * Save session to disk
 */
export function saveSession(session: CodingSession): void {
	ensureSessionsDir();
	const sessionPath = getSessionPath(session.id);
	writeFileSync(sessionPath, JSON.stringify(session, null, 2), 'utf-8');
}

/**
 * Load session by ID
 */
export function loadSession(sessionId: string): CodingSession | null {
	try {
		const sessionPath = getSessionPath(sessionId);
		if (!existsSync(sessionPath)) {
			return null;
		}
		const content = readFileSync(sessionPath, 'utf-8');
		return JSON.parse(content) as CodingSession;
	} catch {
		return null;
	}
}

/**
 * Load all sessions
 */
export function loadAllSessions(): CodingSession[] {
	ensureSessionsDir();

	try {
		const files = readdirSync(SESSIONS_DIR);
		const sessions: CodingSession[] = [];

		for (const file of files) {
			if (file.endsWith('.json')) {
				try {
					const content = readFileSync(join(SESSIONS_DIR, file), 'utf-8');
					sessions.push(JSON.parse(content) as CodingSession);
				} catch {
					// Skip invalid session files
				}
			}
		}

		return sessions;
	} catch {
		return [];
	}
}

/**
 * Find session by task number or tmux session name
 */
export function findSession(identifier: string): CodingSession | null {
	const sessions = loadAllSessions();

	// Try matching by exact tmux session name first (e.g., task-42-abcde)
	const exactMatch = sessions.find(s => s.tmuxSessionName === identifier);
	if (exactMatch) return exactMatch;

	// Try matching by task number
	if (identifier.startsWith('task-') || /^\d+$/.test(identifier)) {
		const taskNum = Number.parseInt(
			identifier.replace(/^task-/, '').split('-')[0],
			10,
		);
		const matchingSessions = sessions.filter(
			s => s.taskNumber === taskNum && s.status !== 'completed',
		);

		if (matchingSessions.length === 0) return null;
		if (matchingSessions.length === 1) return matchingSessions[0];

		// Multiple sessions found - return null to trigger special handling
		return null;
	}

	return null;
}

/**
 * Find all sessions for a task number
 */
export function findSessionsForTask(taskNumber: number): CodingSession[] {
	const sessions = loadAllSessions();
	return sessions.filter(
		s => s.taskNumber === taskNumber && s.status !== 'completed',
	);
}

/**
 * Update session status
 */
export function updateSessionStatus(
	sessionId: string,
	status: SessionStatus,
): void {
	const session = loadSession(sessionId);
	if (session) {
		session.status = status;
		session.lastActivity = new Date().toISOString();
		saveSession(session);
	}
}

/**
 * Get active sessions and validate they still exist in tmux
 */
export function getActiveSessions(validateTmux = false): CodingSession[] {
	const sessions = loadAllSessions().filter(
		s => s.status === 'active' || s.status === 'detached',
	);

	// If validation is requested, check tmux and update status
	if (validateTmux) {
		return sessions.filter(session => {
			const exists = tmuxSessionExists(session.tmuxSessionName);

			// If tmux session doesn't exist, mark as completed
			if (!exists) {
				updateSessionStatus(session.id, 'completed');
				return false;
			}

			return true;
		});
	}

	return sessions;
}

/**
 * Get sessions for a specific task
 */
export function getSessionsForTask(taskNumber: number): CodingSession[] {
	return loadAllSessions().filter(s => s.taskNumber === taskNumber);
}

/**
 * Remove git worktree
 */
function removeWorktree(worktreePath: string, branchName?: string): void {
	try {
		// Remove the worktree
		execSync(`git worktree remove "${worktreePath}" --force`, {
			stdio: 'ignore',
		});

		// Delete the branch if it exists
		if (branchName) {
			try {
				execSync(`git branch -D ${branchName}`, {stdio: 'ignore'});
			} catch {
				// Branch might not exist or already deleted
			}
		}
	} catch (error) {
		console.error('Failed to remove worktree:', error);
	}
}

/**
 * Delete session and cleanup worktree
 */
export function deleteSession(sessionId: string): void {
	const session = loadSession(sessionId);

	// Cleanup worktree if it exists
	if (session?.worktreePath && session?.branchName) {
		removeWorktree(session.worktreePath, session.branchName);
	}

	// Delete session file
	const sessionPath = getSessionPath(sessionId);
	if (existsSync(sessionPath)) {
		unlinkSync(sessionPath);
	}
}
