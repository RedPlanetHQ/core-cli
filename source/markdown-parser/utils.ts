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
