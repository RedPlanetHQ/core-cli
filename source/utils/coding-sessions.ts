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
import {getAppDataPath} from '@/config/paths';
import type {CodingSession, SessionStatus} from '@/types/sessions';
import {readdirSync} from 'fs';

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
	const shortId = sessionId.split('-')[0];
	const tmuxSessionName = taskNumber
		? `core-coding-task-${taskNumber}-${shortId}`
		: `core-coding-${shortId}`;

	const session: CodingSession = {
		id: sessionId,
		tmuxSessionName,
		agentName,
		taskNumber,
		taskDescription,
		status: 'active',
		startedAt: new Date().toISOString(),
		workingDirectory,
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

	// Try matching by task number
	if (identifier.startsWith('task-') || /^\d+$/.test(identifier)) {
		const taskNum = Number.parseInt(identifier.replace('task-', ''), 10);
		const session = sessions.find(
			s => s.taskNumber === taskNum && s.status !== 'completed',
		);
		if (session) return session;
	}

	// Try matching by tmux session name
	const session = sessions.find(s => s.tmuxSessionName === identifier);
	if (session) return session;

	return null;
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
		const {tmuxSessionExists} = require('@/utils/tmux-manager');

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
 * Delete session
 */
export function deleteSession(sessionId: string): void {
	const sessionPath = getSessionPath(sessionId);
	if (existsSync(sessionPath)) {
		unlinkSync(sessionPath);
	}
}
