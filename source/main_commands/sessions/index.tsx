import React from 'react';
import {render, Box, Text} from 'ink';
import {
	findSession,
	findSessionsForTask,
	getActiveSessions,
	deleteSession,
	loadAllSessions,
} from '@/utils/coding-sessions';
import {
	attachToSession,
	tmuxSessionExists,
	killTmuxSession,
} from '@/utils/tmux-manager';
import type {CodingSession} from '@/types/sessions';

// Helper function to format time ago
function formatTimeAgo(dateString: string): string {
	const now = new Date();
	const date = new Date(dateString);
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) return 'just now';
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	return `${diffDays}d ago`;
}

// Components
interface SessionsListProps {
	sessions: CodingSession[];
}

const SessionsList: React.FC<SessionsListProps> = ({sessions}) => {
	if (sessions.length === 0) {
		return (
			<Box flexDirection="column" paddingY={1}>
				<Text>No active coding sessions</Text>
				<Text dimColor>Start a session with: @implement &lt;task#&gt;</Text>
			</Box>
		);
	}

	// Helper to truncate task description
	const truncateDescription = (desc: string, maxLength: number = 50): string => {
		if (desc.length <= maxLength) return desc;
		return desc.substring(0, maxLength) + '...';
	};

	return (
		<Box flexDirection="column" paddingY={1}>
			<Text bold color="blue">
				💻 Active Coding Sessions
			</Text>
			<Text>{''}</Text>

			{sessions.map((session, index) => (
				<Box key={session.id} flexDirection="column" marginBottom={1}>
					<Text>
						{index + 1}. <Text color="cyan">[{session.agentName}]</Text>{' '}
						<Text color="yellow">{session.tmuxSessionName}</Text>
					</Text>
					<Text dimColor>
						{'   '}Task: {session.taskNumber ? `#${session.taskNumber} - ` : ''}
						{truncateDescription(session.taskDescription)}
					</Text>
					<Text dimColor>
						{'   '}Status: {session.status} | Started:{' '}
						{formatTimeAgo(session.startedAt)}
					</Text>
					{session.worktreePath && (
						<>
							<Text dimColor>
								{'   '}Worktree: {session.worktreePath}
							</Text>
							<Text dimColor>
								{'   '}Branch: {session.branchName}
							</Text>
						</>
					)}
					<Text dimColor>
						{'   '}Working Dir: {session.workingDirectory}
					</Text>
					<Text color="green">
						{'   '}Attach: core-cli sessions attach {session.tmuxSessionName}
					</Text>
				</Box>
			))}
		</Box>
	);
};

interface ErrorMessageProps {
	message: string;
	usage?: string;
	examples?: string[];
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
	message,
	usage,
	examples,
}) => (
	<Box flexDirection="column" paddingY={1}>
		<Text color="red">❌ {message}</Text>
		{usage && (
			<>
				<Text>{''}</Text>
				<Text dimColor>Usage: {usage}</Text>
			</>
		)}
		{examples && examples.length > 0 && (
			<>
				<Text>{''}</Text>
				<Text dimColor>Examples:</Text>
				{examples.map((example, idx) => (
					<Text key={idx} dimColor>
						{'  '}
						{example}
					</Text>
				))}
			</>
		)}
	</Box>
);

// Command handlers
export function handleSessionsList(): void {
	const sessions = getActiveSessions(true);
	const {waitUntilExit} = render(<SessionsList sessions={sessions} />);
	void waitUntilExit().then(() => process.exit(0));
}

export function handleSessionsAttach(sessionIdentifier?: string): void {
	if (!sessionIdentifier) {
		const {waitUntilExit} = render(
			<ErrorMessage
				message="Please specify a session identifier"
				usage="core-cli sessions attach <task-number|session-name>"
				examples={[
					'core-cli sessions attach 42',
					'core-cli sessions attach task-42-abcde',
				]}
			/>,
		);
		void waitUntilExit().then(() => process.exit(1));
		return;
	}

	// Check if identifier is a task number and if there are multiple sessions
	const taskNumMatch = sessionIdentifier.match(/^(?:task-)?(\d+)(?:-|$)/);
	if (taskNumMatch) {
		const taskNum = parseInt(taskNumMatch[1], 10);
		const taskSessions = findSessionsForTask(taskNum);

		if (taskSessions.length > 1) {
			// Multiple sessions found - show list and ask user to use exact name
			const {waitUntilExit} = render(
				<Box flexDirection="column" paddingY={1}>
					<Text color="yellow">
						⚠️  Multiple sessions found for task #{taskNum}:
					</Text>
					<Text>{''}</Text>
					{taskSessions.map((s, index) => (
						<Text key={s.id}>
							{index + 1}. {s.tmuxSessionName} - {s.workingDirectory}
						</Text>
					))}
					<Text>{''}</Text>
					<Text dimColor>
						Please use the full session name to attach. Example:
					</Text>
					<Text color="green">
						  core-cli sessions attach {taskSessions[0].tmuxSessionName}
					</Text>
				</Box>,
			);
			void waitUntilExit().then(() => process.exit(1));
			return;
		}
	}

	// Find the session
	const session = findSession(sessionIdentifier);

	if (!session) {
		const {waitUntilExit} = render(
			<ErrorMessage
				message={`Session not found: ${sessionIdentifier}`}
				usage="Run 'core-cli sessions list' to see active sessions"
			/>,
		);
		void waitUntilExit().then(() => process.exit(1));
		return;
	}

	// Check if tmux session exists
	if (!tmuxSessionExists(session.tmuxSessionName)) {
		const {waitUntilExit} = render(
			<ErrorMessage
				message={`Tmux session does not exist: ${session.tmuxSessionName}`}
				usage="The session may have been closed."
			/>,
		);
		void waitUntilExit().then(() => process.exit(1));
		return;
	}

	// Attach to the session
	try {
		attachToSession(session.tmuxSessionName);
		process.exit(0);
	} catch (error) {
		const {waitUntilExit} = render(
			<ErrorMessage
				message={`Failed to attach: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`}
			/>,
		);
		void waitUntilExit().then(() => process.exit(1));
	}
}

export function handleSessionsDelete(sessionIdentifier?: string): void {
	if (!sessionIdentifier) {
		const {waitUntilExit} = render(
			<ErrorMessage
				message="Please specify a session identifier"
				usage="core-cli sessions delete <session-name>"
				examples={['core-cli sessions delete task-42-abcde']}
			/>,
		);
		void waitUntilExit().then(() => process.exit(1));
		return;
	}

	// Find the session
	const session = findSession(sessionIdentifier);

	if (!session) {
		const {waitUntilExit} = render(
			<ErrorMessage
				message={`Session not found: ${sessionIdentifier}`}
				usage="Run 'core-cli sessions list' to see active sessions"
			/>,
		);
		void waitUntilExit().then(() => process.exit(1));
		return;
	}

	try {
		// Kill tmux session if it's running
		if (tmuxSessionExists(session.tmuxSessionName)) {
			killTmuxSession(session.tmuxSessionName);
		}

		// Delete the session (this will also cleanup worktree)
		deleteSession(session.id);

		const {waitUntilExit} = render(
			<Box flexDirection="column" paddingY={1}>
				<Text color="green">✅ Deleted session: {session.tmuxSessionName}</Text>
				{session.worktreePath && (
					<Text dimColor>   Cleaned up worktree: {session.worktreePath}</Text>
				)}
			</Box>,
		);
		void waitUntilExit().then(() => process.exit(0));
	} catch (error) {
		const {waitUntilExit} = render(
			<ErrorMessage
				message={`Failed to delete session: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`}
			/>,
		);
		void waitUntilExit().then(() => process.exit(1));
	}
}

export function handleSessionsClear(): void {
	const sessions = loadAllSessions();

	if (sessions.length === 0) {
		const {waitUntilExit} = render(
			<Box paddingY={1}>
				<Text dimColor>No sessions to clear</Text>
			</Box>,
		);
		void waitUntilExit().then(() => process.exit(0));
		return;
	}

	try {
		let deletedCount = 0;
		let worktreeCount = 0;

		for (const session of sessions) {
			// Kill tmux session if it's running
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

		const {waitUntilExit} = render(
			<Box flexDirection="column" paddingY={1}>
				<Text color="green">
					✅ Cleared {deletedCount} session{deletedCount !== 1 ? 's' : ''}
				</Text>
				{worktreeCount > 0 && (
					<Text dimColor>
						   Cleaned up {worktreeCount} worktree{worktreeCount !== 1 ? 's' : ''}
					</Text>
				)}
			</Box>,
		);
		void waitUntilExit().then(() => process.exit(0));
	} catch (error) {
		const {waitUntilExit} = render(
			<ErrorMessage
				message={`Failed to clear sessions: ${
					error instanceof Error ? error.message : 'Unknown error'
				}`}
			/>,
		);
		void waitUntilExit().then(() => process.exit(1));
	}
}

export function handleSessionsHelp(): void {
	const {waitUntilExit} = render(
		<Box flexDirection="column" paddingY={1}>
			<Text bold color="blue">
				💻 Sessions Commands
			</Text>
			<Text>{''}</Text>
			<Text bold>core-cli sessions list</Text>
			<Text dimColor>  List all active coding agent sessions</Text>
			<Text>{''}</Text>
			<Text bold>core-cli sessions attach &lt;session-name&gt;</Text>
			<Text dimColor>  Attach to an active session</Text>
			<Text dimColor>  Example: core-cli sessions attach task-42-abcde</Text>
			<Text>{''}</Text>
			<Text bold>core-cli sessions delete &lt;session-name&gt;</Text>
			<Text dimColor>  Delete a specific session and cleanup worktree</Text>
			<Text dimColor>  Example: core-cli sessions delete task-42-abcde</Text>
			<Text>{''}</Text>
			<Text bold>core-cli sessions clear</Text>
			<Text dimColor>  Delete all sessions and cleanup all worktrees</Text>
			<Text>{''}</Text>
			<Text bold>core-cli sessions help</Text>
			<Text dimColor>  Show this help message</Text>
		</Box>,
	);
	void waitUntilExit().then(() => process.exit(0));
}

export function handleSessionsCommand(
	subcommand?: string,
	sessionIdentifier?: string,
): void {
	if (!subcommand || subcommand === 'list') {
		handleSessionsList();
		return;
	}

	if (subcommand === 'attach') {
		handleSessionsAttach(sessionIdentifier);
		return;
	}

	if (subcommand === 'delete') {
		handleSessionsDelete(sessionIdentifier);
		return;
	}

	if (subcommand === 'clear') {
		handleSessionsClear();
		return;
	}

	if (subcommand === 'help') {
		handleSessionsHelp();
		return;
	}

	const {waitUntilExit} = render(
		<ErrorMessage
			message={`Unknown sessions subcommand: ${subcommand}`}
			usage="Available subcommands: list, attach, delete, clear, help"
		/>,
	);
	void waitUntilExit().then(() => process.exit(1));
}
