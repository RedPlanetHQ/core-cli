import {Text, Box} from 'ink';
import {memo, useMemo} from 'react';
import {useTheme} from '@/hooks/useTheme';
import type {AssistantMessageProps} from '@/types/index';
import {parseMarkdown} from '@/markdown-parser/index';
import {getAssistantName} from '@/config/preferences';

export default memo(function AssistantMessage({
	message,
	model,
}: AssistantMessageProps) {
	const {colors} = useTheme();
	const assistantName = getAssistantName() || model;

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
					{assistantName}:
				</Text>
			</Box>
			<Text>{renderedMessage}</Text>
		</Box>
	);
});
