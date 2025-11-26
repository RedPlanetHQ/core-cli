import {memo} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '@/hooks/useTheme';
import type {BashExecutionIndicatorProps} from '@/types/index';

export default memo(function BashExecutionIndicator({
	command,
}: BashExecutionIndicatorProps) {
	const {colors} = useTheme();
	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box flexDirection="row">
				<Text color={colors.tool}>● Executing: </Text>
				<Text color={colors.secondary}>{command}</Text>
			</Box>
			<Box marginTop={1}>
				<Text color={colors.secondary}>Press Escape to cancel</Text>
			</Box>
		</Box>
	);
});
