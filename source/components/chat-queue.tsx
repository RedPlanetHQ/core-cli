import {Box} from 'ink';
import {useMemo, Fragment, memo} from 'react';
import type {ChatQueueProps} from '@/types/index';

export default memo(function ChatQueue({
	staticComponents = [],
	queuedComponents = [],
}: ChatQueueProps) {
	// Static components never change - fully memoized
	// Queued components are temporary and will be moved to static after render

	return (
		<Box flexDirection="column" gap={2}>
			{/* Static content - never re-renders */}
			<Box flexDirection="column">
				{staticComponents.length > 0 &&
					staticComponents.map((component, index) => (
						<Fragment key={index}>{component}</Fragment>
					))}
			</Box>
			{/* Queued content - renders once then moves to static */}
			{queuedComponents.length > 0 && (
				<Box flexDirection="column">
					{queuedComponents.map((component, index) => (
						<Fragment key={index}>{component}</Fragment>
					))}
				</Box>
			)}
		</Box>
	);
});
