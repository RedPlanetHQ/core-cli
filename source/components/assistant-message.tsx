import {Text, Box} from 'ink';
import {memo, useMemo} from 'react';
import {useTheme} from '@/hooks/useTheme';
import type {AssistantMessageProps} from '@/types/index';
import {parseMarkdown} from '@/markdown-parser/index';

export default memo(function AssistantMessage({
	message,
	model,
}: AssistantMessageProps) {
	const {colors} = useTheme();

	// Render markdown to terminal-formatted text with theme colors
	const renderedMessage = useMemo(() => {
		try {
			return parseMarkdown(message, colors);
		} catch {
			// Fallback to plain text if markdown parsing fails
			return message;
		}
	}, [message, colors]);

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box>
				<Text color={colors.primary} bold>
					{model}:
				</Text>
			</Box>
			<Text>{renderedMessage}</Text>
		</Box>
	);
});
