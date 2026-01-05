import chalk from 'chalk';

// Strip markdown formatting from text (for width calculations)
export function stripMarkdown(text: string): string {
	let result = text;
	// Remove inline code
	result = result.replace(/`([^`]+)`/g, '$1');
	// Remove bold
	result = result.replace(/\*\*([^*]+)\*\*/g, '$1');
	// Remove italic
	result = result.replace(/\*([^*]+)\*/g, '$1');
	// Remove links
	result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
	return result;
}

// Apply color to text, handling both hex colors and named colors
export function applyColor(
	text: string,
	color: string,
	modifiers?: Array<'bold' | 'italic' | 'underline'>,
): string {
	let chalkFn;

	// Check if it's a hex color (starts with #)
	if (color.startsWith('#')) {
		chalkFn = chalk.hex(color);
	} else {
		// Otherwise treat it as a named color
		// Try to use the color as a method on chalk (e.g., chalk.white, chalk.gray)
		// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
		chalkFn = (chalk as any)[color];
		if (!chalkFn) {
			// Fallback to default if color doesn't exist
			chalkFn = chalk.white;
		}
	}

	// Apply modifiers if provided
	if (modifiers && modifiers.length > 0) {
		for (const modifier of modifiers) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
			chalkFn = chalkFn[modifier];
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
	return chalkFn(text);
}
