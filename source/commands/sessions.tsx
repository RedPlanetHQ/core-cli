/**
 * /sessions command
 * Display all active coding agent sessions
 */

import React from 'react';
import {Box, Text} from 'ink';
import type {Command} from '@/types/commands';
import type {Message} from '@/types/core';
import {getActiveSessions} from '@/utils/coding-sessions';
// Using a simpler time formatting instead of date-fns
function formatDistanceToNow(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMins / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffMins < 1) return 'just now';
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	return `${diffDays}d ago`;
}

interface SessionsDisplayProps {
	sessions: Array<{
		agentName: string;
		taskNumber?: number;
		taskDescription: string;
		tmuxSessionName: string;
		status: string;
		startedAt: string;
	}>;
}

function SessionsDisplay({sessions}: SessionsDisplayProps) {
	if (sessions.length === 0) {
		return (
			<Box flexDirection="column" paddingY={1}>
				<Text color="gray">No active coding sessions</Text>
				<Text color="gray" dimColor>
					Start a session with: /implement &lt;task#&gt;
				</Text>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" paddingY={1}>
			<Text bold color="blue">
				💻 Active Coding Agent Sessions
			</Text>
			<Text>{''}</Text>

			{sessions.map((session, index) => (
				<Box
					key={session.tmuxSessionName}
					flexDirection="column"
					marginBottom={1}
				>
					<Text>
						{index + 1}. [{session.agentName}]{' '}
						{session.taskNumber ? `Task #${session.taskNumber}: ` : ''}
						{session.taskDescription}
					</Text>
					<Text color="gray">
						{'   '}Session: {session.tmuxSessionName}
					</Text>
					<Text color="gray">
						{'   '}Status: {session.status} | Started:{' '}
						{formatDistanceToNow(new Date(session.startedAt))}
					</Text>
					<Text color="green">
						{'   '}Attach: core-cli attach{' '}
						{session.taskNumber
							? `task-${session.taskNumber}`
							: session.tmuxSessionName}
					</Text>
				</Box>
			))}
		</Box>
	);
}

export const sessionsCommand: Command = {
	name: 'sessions',
	description: 'Display active coding agent sessions',
	handler: async (
		_args: string[],
		_messages: Message[],
		_metadata: {
			provider: string;
			model: string;
			tokens: number;
			getMessageTokens: (message: Message) => number;
		},
	) => {
		// Get active sessions with tmux validation
		const activeSessions = getActiveSessions(true);

		const sessionsData = activeSessions.map(session => ({
			agentName: session.agentName,
			taskNumber: session.taskNumber,
			taskDescription: session.taskDescription,
			tmuxSessionName: session.tmuxSessionName,
			status: session.status,
			startedAt: session.startedAt,
		}));

		return React.createElement(SessionsDisplay, {
			key: `sessions-${Date.now()}`,
			sessions: sessionsData,
		});
	},
};
