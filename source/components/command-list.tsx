import {Box, Text} from 'ink';
import {useMemo} from 'react';
import {useTheme} from '@/hooks/useTheme';
import {Completion} from '@/types/index';

interface CommandListProps {
	completions: Completion[];
	selectedIndex: number;
	maxVisible?: number;
}

export default function CommandList({
	completions,
	selectedIndex,
	maxVisible = 5,
}: CommandListProps) {
	const {colors} = useTheme();

	// Calculate the visible window of commands
	const {visibleCommands, startIndex} = useMemo(() => {
		if (completions.length <= maxVisible) {
			return {
				visibleCommands: completions,
				startIndex: 0,
			};
		}

		// Calculate the window to show, keeping the selected item visible
		let start = Math.max(0, selectedIndex - Math.floor(maxVisible / 2));
		const end = Math.min(completions.length, start + maxVisible);

		// Adjust start if we're at the end
		if (end - start < maxVisible) {
			start = Math.max(0, end - maxVisible);
		}

		return {
			visibleCommands: completions.slice(start, end),
			startIndex: start,
		};
	}, [completions, selectedIndex, maxVisible]);

	const hasMore = completions.length > maxVisible;
	const showingMore = hasMore && startIndex > 0;
	const hasMoreBelow =
		hasMore && startIndex + visibleCommands.length < completions.length;

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color={colors.white}>
				Available commands (↑/↓ to navigate, Tab to select)
				{hasMore && (
					<Text color={colors.secondary}>
						{' '}
						- {selectedIndex + 1}/{completions.length}
					</Text>
				)}
				:
			</Text>

			{showingMore && (
				<Text color={colors.white} dimColor>
					... {startIndex} more above
				</Text>
			)}

			{visibleCommands.map((completion, index) => {
				const actualIndex = startIndex + index;
				const isSelected = actualIndex === selectedIndex;

				return (
					<Text
						key={actualIndex}
						color={completion.isCustom ? colors.white : colors.white}
						bold={isSelected}
					>
						{isSelected ? '▸ ' : '  '}/{completion.name}
					</Text>
				);
			})}

			{hasMoreBelow && (
				<Text color={colors.white} dimColor>
					... {completions.length - (startIndex + visibleCommands.length)} more
					below
				</Text>
			)}
		</Box>
	);
}
