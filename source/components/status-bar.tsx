import {Box, Text} from 'ink';
import {useEffect, useState} from 'react';
import {useTheme} from '@/hooks/useTheme';
import {DevelopmentMode, DEVELOPMENT_MODE_LABELS} from '@/types/core';
import {readWeekTasks} from '@/utils/tasks';
import {TaskState} from '@/types/tasks';
import {getActiveSessions} from '@/utils/coding-sessions';

interface StatusBarProps {
	developmentMode: DevelopmentMode;
	mcpStatus?: string | null;
	isIncognitoMode?: boolean;
}

export default function StatusBar({
	developmentMode,
	mcpStatus = null,
	isIncognitoMode = false,
}: StatusBarProps) {
	const {colors} = useTheme();
	const [taskCounts, setTaskCounts] = useState({todo: 0, inProgress: 0});
	const [activeSessions, setActiveSessions] = useState(0);

	// Load task counts and active sessions
	useEffect(() => {
		const loadCounts = async () => {
			try {
				// Load task counts
				const tasks = await readWeekTasks();
				const todoCount = tasks.filter(t => t.state === TaskState.TODO).length;
				const inProgressCount = tasks.filter(
					t => t.state === TaskState.IN_PROGRESS,
				).length;
				setTaskCounts({todo: todoCount, inProgress: inProgressCount});

				// Load active sessions count
				const sessions = getActiveSessions(true);
				setActiveSessions(sessions.length);
			} catch (error) {
				// Silent failure - don't break UI if loading fails
				console.warn('Failed to load counts:', error);
			}
		};

		void loadCounts();
	}, []);

	return (
		<Box marginTop={0} flexDirection="row" justifyContent="space-between">
			{/* Right side: Task counts, Sessions, and MCP status */}
			<Box flexDirection="row" gap={2}>
				{/* Task counts */}
				<Text color={colors.secondary}>
					<Text bold>Tasks:</Text> {taskCounts.todo} todo,{' '}
					{taskCounts.inProgress} in progress
				</Text>

				{/* Active sessions */}
				<Text color={activeSessions > 0 ? colors.success : colors.secondary}>
					<Text bold>Sessions:</Text> {activeSessions} active
				</Text>

				{/* MCP status */}
				{mcpStatus && (
					<Text
						color={
							mcpStatus.includes('Failed')
								? colors.error
								: mcpStatus.includes('Connected')
								? colors.success
								: colors.info
						}
					>
						{mcpStatus}
					</Text>
				)}

				{/* Incognito mode indicator */}
				{isIncognitoMode && (
					<Text color={colors.warning}>
						<Text bold>Incognito</Text>
					</Text>
				)}
			</Box>

			{/* Development mode indicator - left */}
			{developmentMode !== 'normal' && (
				<Text
					color={
						developmentMode === 'auto-accept' ? colors.info : colors.warning
					}
				>
					<Text bold>{DEVELOPMENT_MODE_LABELS[developmentMode]}</Text>{' '}
					<Text dimColor>(Shift+Tab to cycle)</Text>
				</Text>
			)}
		</Box>
	);
}
