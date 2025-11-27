import React, {useState} from 'react';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Text, Box, useInput} from 'ink';

import {useTheme} from '@/hooks/useTheme';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';

const PREVIEW_CHARS = 100; // Number of characters to show when collapsed

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
	let totalChars = 0;
	let remainingChars = 0;

	if (typeof message === 'string') {
		totalChars = message.length;
		shouldCollapse = totalChars > PREVIEW_CHARS;

		if (shouldCollapse && !isExpanded) {
			// Show only first N characters
			const preview = message.slice(0, PREVIEW_CHARS);
			remainingChars = totalChars - PREVIEW_CHARS;
			messageContent = (
				<>
					<Text color={colors.white} dimColor>
						{preview}
					</Text>
					<Text color={colors.muted} dimColor>
						... {remainingChars} more character{remainingChars !== 1 ? 's' : ''}{' '}
						(Press Ctrl+O to expand)
					</Text>
				</>
			);
		} else {
			messageContent = (
				<Text color={colors.white} dimColor>
					{message}
				</Text>
			);
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
