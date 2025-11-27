/**
 * Tasks display component for /tasks command
 */

import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Box, Text} from 'ink';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';
import {useTheme} from '@/hooks/useTheme';

interface TasksDisplayProps {
	weekId: string;
	markdownContent: string;
	todoCount: number;
	inProgressCount: number;
	completedCount: number;
}

export function TasksDisplay({
	weekId,
	markdownContent,
	todoCount,
	inProgressCount,
	completedCount,
}: TasksDisplayProps) {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();

	// Split markdown content into lines for display
	const lines = markdownContent.split('\n');

	return (
		<TitledBox
			key={colors.white}
			borderStyle="round"
			titles={[`Tasks - ${weekId}`]}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.white}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			<Box marginBottom={1}>
				<Text color={colors.white} dimColor>
					Todo:{' '}
					<Text color={colors.white} bold>
						{todoCount}
					</Text>{' '}
					| In Progress:{' '}
					<Text color={colors.info} bold>
						{inProgressCount}
					</Text>{' '}
					| Completed:{' '}
					<Text color={colors.success} bold>
						{completedCount}
					</Text>
				</Text>
			</Box>

			{/* Markdown Content */}
			<Box marginTop={1} marginBottom={1}>
				<Text color={colors.white} bold>
					Tasks File Content
				</Text>
			</Box>
			<Box flexDirection="column">
				{lines.map((line, index) => {
					// Color code different sections
					let color = colors.info;
					let bold = false;
					let dimColor = false;

					if (line.startsWith('## ')) {
						color = colors.white;
						bold = true;
						dimColor = true;
					} else if (line.includes('[x]')) {
						color = colors.success;
					} else if (line.includes('[>]')) {
						color = colors.info;
					} else if (line.includes('[ ]')) {
						color = colors.white;
					}

					return (
						<Text key={index} color={color} bold={bold} dimColor={dimColor}>
							{line || ' '}
						</Text>
					);
				})}
			</Box>
		</TitledBox>
	);
}
