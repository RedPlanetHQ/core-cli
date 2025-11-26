/**
 * ASCII progress bar component for usage visualization
 */

import React from 'react';
import {Text} from 'ink';

interface ProgressBarProps {
	percent: number;
	width: number;
	color: string;
}

/**
 * Renders an ASCII progress bar
 */
export function ProgressBar({percent, width, color}: ProgressBarProps) {
	const clampedPercent = Math.min(100, Math.max(0, percent));
	const filledWidth = Math.round((width * clampedPercent) / 100);
	const emptyWidth = width - filledWidth;

	const filledBar = '█'.repeat(filledWidth);
	const emptyBar = '░'.repeat(emptyWidth);

	return (
		<Text>
			<Text color={color}>{filledBar}</Text>
			<Text color="gray">{emptyBar}</Text>
		</Text>
	);
}
