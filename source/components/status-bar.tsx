import {Box, Text} from 'ink';
import {useEffect, useState} from 'react';
import {useTheme} from '@/hooks/useTheme';
import {DevelopmentMode, DEVELOPMENT_MODE_LABELS} from '@/types/core';
import {readWeekTasks} from '@/utils/tasks';
import {TaskState} from '@/types/tasks';

interface StatusBarProps {
	developmentMode: DevelopmentMode;
	mcpStatus?: string | null;
}

export default function StatusBar({
	developmentMode,
	mcpStatus = null,
}: StatusBarProps) {
	const {colors} = useTheme();
	const [taskCounts, setTaskCounts] = useState({todo: 0, inProgress: 0});

	// Load task counts
	useEffect(() => {
		const loadTaskCounts = async () => {
			try {
				const tasks = await readWeekTasks();
				const todoCount = tasks.filter(t => t.state === TaskState.TODO).length;
				const inProgressCount = tasks.filter(
					t => t.state === TaskState.IN_PROGRESS,
				).length;
				setTaskCounts({todo: todoCount, inProgress: inProgressCount});
			} catch (error) {
				// Silent failure - don't break UI if task loading fails
				console.warn('Failed to load task counts:', error);
			}
		};

		void loadTaskCounts();
	}, []);

	return (
		<Box marginTop={0} flexDirection="row" justifyContent="space-between">
			{/* Right side: Task counts and MCP status */}
			<Box flexDirection="row" gap={2}>
				{/* Task counts */}
				<Text color={colors.secondary}>
					<Text bold>Tasks:</Text> {taskCounts.todo} todo,{' '}
					{taskCounts.inProgress} in progress
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
