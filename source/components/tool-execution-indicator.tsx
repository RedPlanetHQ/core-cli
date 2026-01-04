import React from 'react';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';
import {useTheme} from '@/hooks/useTheme';
import type {ToolExecutionIndicatorProps} from '@/types/index';

export default function ToolExecutionIndicator({
	toolName,
	currentIndex,
	totalTools,
	toolArgs,
	toolManager,
}: ToolExecutionIndicatorProps) {
	const {colors} = useTheme();
	const [customDisplay, setCustomDisplay] =
		React.useState<React.ReactElement | null>(null);

	// Get the progress formatter for this tool
	const progressFormatter = toolManager?.getProgressFormatter?.(toolName);

	// Render custom display once on mount
	React.useEffect(() => {
		if (!progressFormatter || !toolArgs) {
			return;
		}

		// Render the custom display with empty updates (just show loading state)
		void (async () => {
			try {
				const element = await progressFormatter(toolArgs, []);
				setCustomDisplay(element);
			} catch (error) {
				// If formatter fails, fall back to default display
				console.error('Progress formatter error:', error);
				setCustomDisplay(null);
			}
		})();
	}, [progressFormatter, toolArgs]);

	// If we have a custom display from the progress formatter, show it
	if (customDisplay) {
		return (
			<Box flexDirection="column" marginBottom={1}>
				<Box>
					<Spinner type="dots2" />
					<Text color={colors.tool}> </Text>
				</Box>
				{customDisplay}
				{totalTools > 1 && (
					<Box marginTop={1}>
						<Text color={colors.white} dimColor>
							Tool {currentIndex + 1} of {totalTools}
						</Text>
					</Box>
				)}
				<Box marginTop={1}>
					<Text color={colors.white} dimColor>
						Press Escape to cancel
					</Text>
				</Box>
			</Box>
		);
	}

	// Default display (no progress formatter)
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Spinner type="dots2" />
				<Text color={colors.tool}> Executing tool: </Text>
				<Text color={colors.white}>{toolName}</Text>
			</Box>

			{totalTools > 1 && (
				<Box marginTop={1}>
					<Text color={colors.white} dimColor>
						Tool {currentIndex + 1} of {totalTools}
					</Text>
				</Box>
			)}

			<Box marginTop={1}>
				<Text color={colors.white} dimColor>
					Press Escape to cancel
				</Text>
			</Box>
		</Box>
	);
}
