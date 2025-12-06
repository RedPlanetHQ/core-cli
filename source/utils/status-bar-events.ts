/**
 * Simple event system for status bar updates
 * This allows tools and utilities to trigger status bar refreshes
 * without having direct access to app state
 */

type StatusBarRefreshCallback = () => void;

let refreshCallback: StatusBarRefreshCallback | null = null;

/**
 * Register the status bar refresh callback
 * Should be called once when the app initializes
 */
export function registerStatusBarRefresh(callback: StatusBarRefreshCallback): void {
	refreshCallback = callback;
}

/**
 * Trigger a status bar refresh
 * Can be called from anywhere (tools, utilities, etc.)
 */
export function triggerStatusBarRefresh(): void {
	if (refreshCallback) {
		refreshCallback();
	}
}
