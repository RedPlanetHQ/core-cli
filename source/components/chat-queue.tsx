import {Box} from 'ink';
import {useMemo, Fragment, memo} from 'react';
import type {ChatQueueProps} from '@/types/index';

export default memo(function ChatQueue({
	staticComponents = [],
	queuedComponents = [],
}: ChatQueueProps) {
	// Move ALL messages to static - prevents any re-renders
	// All messages are now immutable once rendered
	const allStaticComponents = useMemo(
		() => [...staticComponents, ...queuedComponents],
		[staticComponents, queuedComponents],
	);

	return (
		<Box flexDirection="column" gap={2}>
			{/* All content is static to prevent re-renders */}
			<Box flexDirection="column">
				{allStaticComponents.length > 0 &&
					allStaticComponents.map((component, index) => (
						<Fragment key={index}>{component}</Fragment>
					))}
			</Box>
		</Box>
	);
});
