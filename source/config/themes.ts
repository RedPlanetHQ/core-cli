import type {Theme, ThemePreset, Colors} from '@/types/ui';

const darkThemeColors: Colors = {
	white: '#E7E7E7',
	black: '#222222',
	primary: '#C15E50',
	muted: '#B4B4B4',
	tool: '#BF4594',
	success: '#7DC599',
	error: '#D45453',
	secondary: '#AD6E30',
	info: '#C15E50',
	warning: '#DDA068',
	diffAdded: '#1e2f1e',
	diffRemoved: '#2f1e1e',
	diffAddedText: '#9ece6a',
	diffRemovedText: '#f7768e',
};

const lightThemeColors: Colors = {
	white: '#1a1a1a',
	black: '#f5f5f5',
	primary: '#B94A3C',
	muted: '#B94A3C',
	tool: '#A83585',
	success: '#2D8659',
	error: '#C13332',
	secondary: '#8B5A25',
	info: '#B94A3C',
	warning: '#C78540',
	diffAdded: '#e6f5ea',
	diffRemoved: '#fce8e8',
	diffAddedText: '#2d8659',
	diffRemovedText: '#c13332',
};

/**
 * Detect if terminal is using a light or dark background
 * Uses COLORFGBG environment variable or defaults to dark
 */
export function detectTerminalTheme(): 'dark' | 'light' {
	// Check COLORFGBG environment variable (format: "foreground;background")
	const colorFgBg = process.env.COLORFGBG;
	if (colorFgBg) {
		const parts = colorFgBg.split(';');
		const bg = parts[parts.length - 1];
		if (bg) {
			const bgNum = parseInt(bg, 10);
			// ANSI colors 0-6 are typically dark, 7-15 are bright/light
			if (!isNaN(bgNum)) {
				return bgNum >= 7 ? 'light' : 'dark';
			}
		}
	}

	// Check for common light theme indicators in environment
	const term = process.env.TERM_PROGRAM || '';

	if (
		process.env.THEME === 'light' ||
		process.env.COLORTERM === 'light' ||
		term.toLowerCase().includes('light')
	) {
		return 'light';
	}

	// Default to dark theme (most common for developers)
	return 'dark';
}

export const themes: Record<ThemePreset, Theme> = {
	main: {
		name: 'main',
		displayName: 'Main',
		colors:
			detectTerminalTheme() === 'dark' ? darkThemeColors : lightThemeColors,
	},
};

export function getThemeColors(themePreset: ThemePreset): Colors {
	return themes[themePreset].colors;
}

export const defaultTheme: ThemePreset = 'main';
