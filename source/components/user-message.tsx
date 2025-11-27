import {Box, Text} from 'ink';
import {memo} from 'react';
import {useTheme} from '@/hooks/useTheme';
import type {UserMessageProps} from '@/types/index';

// Parse a line and return segments with file placeholders highlighted
function parseLineWithPlaceholders(line: string) {
	const segments: Array<{text: string; isPlaceholder: boolean}> = [];
	const filePattern = /\[@[^\]]+\]/g;
	let lastIndex = 0;
	let match;

	while ((match = filePattern.exec(line)) !== null) {
		// Add text before the placeholder
		if (match.index > lastIndex) {
			segments.push({
				text: line.slice(lastIndex, match.index),
				isPlaceholder: false,
			});
		}

		// Add the placeholder
		segments.push({
			text: match[0],
			isPlaceholder: true,
		});

		lastIndex = match.index + match[0].length;
	}

	// Add remaining text
	if (lastIndex < line.length) {
		segments.push({
			text: line.slice(lastIndex),
			isPlaceholder: false,
		});
	}

	return segments;
}

export default memo(function UserMessage({message}: UserMessageProps) {
	const {colors} = useTheme();

	const lines = message.split('\n');

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Text color={colors.secondary} bold>
					You:
				</Text>
			</Box>
			<Box flexDirection="column">
				{lines.map((line, lineIndex) => {
					const segments = parseLineWithPlaceholders(line);
					return (
						<Text key={lineIndex}>
							{segments.map((segment, segIndex) => (
								<Text
									key={segIndex}
									color={segment.isPlaceholder ? colors.info : colors.white}
									bold={segment.isPlaceholder}
								>
									{segment.text}
								</Text>
							))}
						</Text>
					);
				})}
			</Box>
		</Box>
	);
});
