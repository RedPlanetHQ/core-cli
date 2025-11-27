import {Box, Text} from 'ink';
import {useMemo} from 'react';
import {useTheme} from '@/hooks/useTheme';

interface RoutinesListProps {
	routines: string[];
	selectedIndex: number;
	maxVisible?: number;
}

export default function RoutinesList({
	routines,
	selectedIndex,
	maxVisible = 5,
}: RoutinesListProps) {
	const {colors} = useTheme();

	// Calculate the visible window of routines
	const {visibleRoutines, startIndex} = useMemo(() => {
		if (routines.length <= maxVisible) {
			return {
				visibleRoutines: routines,
				startIndex: 0,
			};
		}

		// Calculate the window to show, keeping the selected item visible
		let start = Math.max(0, selectedIndex - Math.floor(maxVisible / 2));
		const end = Math.min(routines.length, start + maxVisible);

		// Adjust start if we're at the end
		if (end - start < maxVisible) {
			start = Math.max(0, end - maxVisible);
		}

		return {
			visibleRoutines: routines.slice(start, end),
			startIndex: start,
		};
	}, [routines, selectedIndex, maxVisible]);

	const hasMore = routines.length > maxVisible;
	const showingMore = hasMore && startIndex > 0;
	const hasMoreBelow =
		hasMore && startIndex + visibleRoutines.length < routines.length;

	return (
		<Box flexDirection="column" marginTop={1}>
			<Text color={colors.white}>
				Available routines (↑/↓ to navigate, Tab to select)
				{hasMore && (
					<Text color={colors.secondary}>
						{' '}
						- {selectedIndex + 1}/{routines.length}
					</Text>
				)}
				:
			</Text>

			{showingMore && (
				<Text color={colors.white} dimColor>
					... {startIndex} more above
				</Text>
			)}

			{visibleRoutines.map((routine, index) => {
				const actualIndex = startIndex + index;
				const isSelected = actualIndex === selectedIndex;

				return (
					<Text key={actualIndex} color={colors.white} bold={isSelected}>
						{isSelected ? '▸ ' : '  '}@{routine}
					</Text>
				);
			})}

			{hasMoreBelow && (
				<Text color={colors.white} dimColor>
					... {routines.length - (startIndex + visibleRoutines.length)} more
					below
				</Text>
			)}
		</Box>
	);
}
