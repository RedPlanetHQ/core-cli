import React, {useState} from 'react';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Text, Box, useInput} from 'ink';

import {useTheme} from '@/hooks/useTheme';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';

const PREVIEW_LINES = 3; // Number of lines to show when collapsed

export default function ToolMessage({
	title,
	message,
	hideTitle = false,
	hideBox = false,
	isBashMode = false,
}: {
	title?: string;
	message: string | React.ReactNode;
	hideTitle?: boolean;
	hideBox?: boolean;
	isBashMode?: boolean;
}) {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();
	const [isExpanded, setIsExpanded] = useState(false);

	// Handle Ctrl+O to toggle expansion
	useInput((input, key) => {
		if (key.ctrl && input === 'o') {
			setIsExpanded(prev => !prev);
		}
	});

	// Handle both string and ReactNode messages
	let messageContent: React.ReactNode;
	let shouldCollapse = false;
	let totalLines = 0;
	let previewLines = 0;

	if (typeof message === 'string') {
		const lines = message.split('\n');
		totalLines = lines.length;
		shouldCollapse = totalLines > PREVIEW_LINES;

		if (shouldCollapse && !isExpanded) {
			// Show only first N lines
			const preview = lines.slice(0, PREVIEW_LINES).join('\n');
			previewLines = totalLines - PREVIEW_LINES;
			messageContent = (
				<>
					<Text color={colors.white} dimColor>
						{preview}
					</Text>
					<Text color={colors.muted}>
						{'\n'}... {previewLines} more line{previewLines !== 1 ? 's' : ''}{' '}
						(Press Ctrl+O to expand)
					</Text>
				</>
			);
		} else {
			messageContent = <Text color={colors.white}>{message}</Text>;
		}
	} else {
		messageContent = message;
	}

	const borderColor = colors.tool;
	const borderStyle = 'round';

	// Add collapse hint when expanded
	const collapseHint =
		shouldCollapse && isExpanded ? (
			<Text color={colors.secondary} dimColor>
				(Press Ctrl+O to collapse)
			</Text>
		) : null;

	return (
		<>
			{hideBox ? (
				<Box width={boxWidth} flexDirection="column" marginBottom={1}>
					{isBashMode && (
						<Text color={colors.tool} bold>
							Bash Command Output
						</Text>
					)}
					{messageContent}
					{collapseHint}
					{isBashMode && (
						<Text color={colors.secondary} dimColor>
							Output truncated to 4k characters to save context
						</Text>
					)}
				</Box>
			) : hideTitle ? (
				<Box
					borderStyle={borderStyle}
					width={boxWidth}
					borderColor={borderColor}
					paddingX={2}
					paddingY={0}
					flexDirection="column"
				>
					{messageContent}
					{collapseHint}
					{isBashMode && (
						<Text color={colors.white} dimColor>
							Output truncated to 4k characters to save context
						</Text>
					)}
				</Box>
			) : (
				<TitledBox
					key={colors.primary}
					borderStyle={borderStyle}
					titles={[title || 'Tool Message']}
					titleStyles={titleStyles.pill}
					width={boxWidth}
					borderColor={borderColor}
					paddingX={2}
					paddingY={1}
					flexDirection="column"
					marginBottom={1}
				>
					{messageContent}
					{collapseHint}
					{isBashMode && (
						<Text color={colors.tool} dimColor>
							Output truncated to 4k characters to save context
						</Text>
					)}
				</TitledBox>
			)}
		</>
	);
}
