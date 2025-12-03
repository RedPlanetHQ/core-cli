import {Box, Static} from 'ink';
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
		<Box flexDirection="column">
			{/* All content is static to prevent re-renders */}
			{allStaticComponents.length > 0 && (
				<Static items={allStaticComponents}>
					{(component, index) => {
						const key =
							component &&
							typeof component === 'object' &&
							'key' in component &&
							component.key
								? component.key
								: `static-${index}`;

						return <Fragment key={key}>{component}</Fragment>;
					}}
				</Static>
			)}
		</Box>
	);
});
