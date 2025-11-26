// Decode HTML entities
export function decodeHtmlEntities(text: string): string {
	const entities: Record<string, string> = {
		'&nbsp;': ' ',
		'&amp;': '&',
		'&lt;': '<',
		'&gt;': '>',
		'&quot;': '"',
		'&apos;': "'",
		'&copy;': '©',
		'&reg;': '®',
		'&trade;': '™',
		'&euro;': '€',
		'&pound;': '£',
		'&yen;': '¥',
		'&cent;': '¢',
		'&sect;': '§',
		'&deg;': '°',
		'&plusmn;': '±',
		'&times;': '×',
		'&divide;': '÷',
		'&ndash;': '–',
		'&mdash;': '—',
		'&lsquo;': '\u2018',
		'&rsquo;': '\u2019',
		'&ldquo;': '\u201C',
		'&rdquo;': '\u201D',
		'&hellip;': '…',
		'&bull;': '•',
	};

	let result = text;
	// Replace named entities
	for (const [entity, char] of Object.entries(entities)) {
		result = result.replace(new RegExp(entity, 'g'), char);
	}
	// Replace numeric entities (e.g., &#160; or &#xA0;)
	result = result.replace(/&#(\d+);/g, (_match, code: string) =>
		String.fromCharCode(parseInt(code, 10)),
	);
	result = result.replace(/&#x([0-9A-Fa-f]+);/g, (_match, code: string) =>
		String.fromCharCode(parseInt(code, 16)),
	);
	return result;
}
