import React from 'react';
import {Box, Text} from 'ink';
import Spinner from 'ink-spinner';
import {useTheme} from '@/hooks/useTheme';
import type {ToolManager} from '@/tools/tool-manager';
import type {ToolProgressUpdate} from '@/types/core';
import {progressRegistry} from '@/utils/progress-registry';

interface ProgressIndicatorProps {
	toolName: string;
	toolArgs?: any;
	toolManager?: ToolManager | null;
	toolCallId?: string; // Unique ID to register for progress updates
}

/**
 * Progress indicator for tool execution
 * Shows tool-specific display if progressFormatter exists, otherwise shows default
 * Can receive real-time updates from tools that report progress
 */
export default function ProgressIndicator({
	toolName,
	toolArgs,
	toolManager,
	toolCallId,
}: ProgressIndicatorProps) {
	const {colors} = useTheme();
	const [customDisplay, setCustomDisplay] =
		React.useState<React.ReactElement | null>(null);
	const [updates, setUpdates] = React.useState<ToolProgressUpdate[]>([]);

	// Get the progress formatter for this tool
	const progressFormatter = toolManager?.getProgressFormatter?.(toolName);

	// Register for progress updates
	React.useEffect(() => {
		if (!toolCallId || !progressFormatter) {
			return;
		}

		// Register callback to receive progress updates
		const callback = (update: ToolProgressUpdate) => {
			setUpdates(prev => [...prev, update]);
		};

		progressRegistry.register(toolCallId, callback);

		// Cleanup on unmount
		return () => {
			progressRegistry.unregister(toolCallId);
		};
	}, [toolCallId, progressFormatter]);

	// Re-render custom display when updates change
	React.useEffect(() => {
		if (!progressFormatter || !toolArgs) {
			return;
		}

		// Render the custom display with current updates
		void (async () => {
			try {
				const element = await progressFormatter(toolArgs, updates);
				setCustomDisplay(element);
			} catch (error) {
				// If formatter fails, fall back to default display
				console.error('Progress formatter error:', error);
				setCustomDisplay(null);
			}
		})();
	}, [progressFormatter, toolArgs, updates]);

	// If we have a custom display from the progress formatter, show it
	if (customDisplay) {
		return (
			<Box flexDirection="row" marginBottom={1}>
				<Spinner type="dots2" />
				<Text color={colors.tool}> </Text>
				{customDisplay}
			</Box>
		);
	}

	// Default display (no progress formatter)
	return (
		<Box flexDirection="row" marginBottom={1}>
			<Spinner type="dots2" />
			<Text color={colors.tool}> Executing: </Text>
			<Text color={colors.white}>{toolName}</Text>
		</Box>
	);
}
