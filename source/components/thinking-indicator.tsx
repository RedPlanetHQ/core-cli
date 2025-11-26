import {memo, useState, useEffect, useRef} from 'react';
import {Box, Text} from 'ink';
import {useTheme} from '@/hooks/useTheme';

const THINKING_WORDS = [
	'Thinking',
	'Processing',
	'Analyzing',
	'Contemplating',
	'Pondering',
	'Computing',
	'Reasoning',
	'Considering',
	'Evaluating',
	'Deliberating',
	'Reflecting',
	'Cogitating',
	'Calculating',
	'Strategizing',
	'Synthesizing',
	'Brainstorming',
	'Hypothesizing',
	'Deducing',
	'Inferring',
	'Conceptualizing',
	'Formulating',
	'Investigating',
	'Examining',
	'Interpreting',
	'Deciphering',
	'Solving',
	'Exploring',
	'Assessing',
	'Ruminating',
	'Meditating',
];

export default memo(function ThinkingIndicator() {
	const {colors} = useTheme();
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [wordIndex, setWordIndex] = useState(0);
	const startTimeRef = useRef<number>(0);

	useEffect(() => {
		startTimeRef.current = Date.now();
		// eslint-disable-next-line react-hooks/set-state-in-effect -- Initialization on mount is intentional
		setElapsedSeconds(0);
	}, []);

	useEffect(() => {
		const timer = setInterval(() => {
			const currentTime = Date.now();
			const elapsed = Math.floor((currentTime - startTimeRef.current) / 1000);
			setElapsedSeconds(elapsed);
		}, 1000);

		return () => {
			clearInterval(timer);
		};
	}, []);

	useEffect(() => {
		const wordTimer = setInterval(() => {
			setWordIndex(Math.floor(Math.random() * THINKING_WORDS.length));
		}, 3000);

		return () => {
			clearInterval(wordTimer);
		};
	}, []);

	// Cycle through 1-3 dots based on elapsed seconds
	const dots = '.'.repeat((elapsedSeconds % 4) + 1);

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box flexWrap="wrap">
				<Text color={colors.primary} bold italic>
					{THINKING_WORDS[wordIndex]}
					{dots}{' '}
				</Text>
				<Text color={colors.white}>{elapsedSeconds}s</Text>
			</Box>
			<Box marginTop={1}>
				<Text color={colors.white} dimColor>
					Press Escape to cancel
				</Text>
			</Box>
		</Box>
	);
});
