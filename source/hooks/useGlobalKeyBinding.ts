/**
 * useGlobalKeyBinding Hook
 *
 * Convenient hook for components to register global key bindings
 * that work even when the component doesn't have focus.
 */

import {useEffect, useCallback} from 'react';
import {
	useKeyBindingContext,
	type KeyPress,
	type KeyBindingHandler,
	type KeyBindingOptions,
} from '@/contexts/KeyBindingContext';

export interface KeyMatcher {
	ctrl?: boolean;
	shift?: boolean;
	meta?: boolean;
	key?: string;
	escape?: boolean;
	return?: boolean;
	tab?: boolean;
	upArrow?: boolean;
	downArrow?: boolean;
	leftArrow?: boolean;
	rightArrow?: boolean;
}

/**
 * Register a global key binding
 *
 * @param matcher - Describes which key combination to match
 * @param handler - Function to call when key is pressed (return true to stop propagation)
 * @param options - Additional options (id, priority, enabled condition)
 * @param deps - Dependency array for the handler (like useCallback/useEffect)
 *
 * @example
 * ```tsx
 * // Register Ctrl+O to toggle expansion
 * useGlobalKeyBinding(
 *   { ctrl: true, key: 'o' },
 *   () => {
 *     setIsExpanded(prev => !prev);
 *     return true; // Stop propagation
 *   },
 *   { id: 'tool-message-expand', priority: 10 },
 *   [setIsExpanded]
 * );
 * ```
 */
export function useGlobalKeyBinding(
	matcher: KeyMatcher,
	handler: () => boolean | void,
	options: KeyBindingOptions,
	deps: React.DependencyList = [],
): void {
	const {register} = useKeyBindingContext();

	// eslint-disable-next-line react-hooks/exhaustive-deps
	const stableHandler = useCallback(handler, deps);

	useEffect(() => {
		const wrappedHandler: KeyBindingHandler = (keyPress: KeyPress) => {
			if (matchesKey(keyPress, matcher)) {
				return stableHandler();
			}
			return false;
		};

		const unregister = register(wrappedHandler, options);
		return unregister;
	}, [register, matcher, stableHandler, options]);
}

/**
 * Check if a key press matches a matcher
 */
function matchesKey(keyPress: KeyPress, matcher: KeyMatcher): boolean {
	const {input, key} = keyPress;

	// Check modifiers
	if (matcher.ctrl !== undefined && key.ctrl !== matcher.ctrl) {
		return false;
	}
	if (matcher.shift !== undefined && key.shift !== matcher.shift) {
		return false;
	}
	if (matcher.meta !== undefined && key.meta !== matcher.meta) {
		return false;
	}

	// Check special keys
	if (matcher.escape && !key.escape) {
		return false;
	}
	if (matcher.return && !key.return) {
		return false;
	}
	if (matcher.tab && !key.tab) {
		return false;
	}
	if (matcher.upArrow && !key.upArrow) {
		return false;
	}
	if (matcher.downArrow && !key.downArrow) {
		return false;
	}
	if (matcher.leftArrow && !key.leftArrow) {
		return false;
	}
	if (matcher.rightArrow && !key.rightArrow) {
		return false;
	}

	// Check input character
	if (matcher.key !== undefined && input !== matcher.key) {
		return false;
	}

	return true;
}
