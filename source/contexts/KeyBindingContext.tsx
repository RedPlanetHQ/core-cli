/**
 * KeyBindingContext
 *
 * Provides a centralized way for components to register global key bindings
 * that are handled by the main UserInput component.
 */

import React, {createContext, useContext, useCallback, useRef} from 'react';

export interface KeyPress {
	input: string;
	key: {
		escape?: boolean;
		return?: boolean;
		tab?: boolean;
		upArrow?: boolean;
		downArrow?: boolean;
		leftArrow?: boolean;
		rightArrow?: boolean;
		shift?: boolean;
		ctrl?: boolean;
		meta?: boolean;
		pageDown?: boolean;
		pageUp?: boolean;
	};
}

export type KeyBindingHandler = (keyPress: KeyPress) => boolean | void;

export interface KeyBindingOptions {
	/**
	 * Unique ID for this binding (useful for debugging)
	 */
	id: string;
	/**
	 * Priority: higher priority handlers are called first
	 * Default: 0
	 */
	priority?: number;
	/**
	 * Optional condition to check if binding is enabled
	 */
	enabled?: () => boolean;
}

interface KeyBindingEntry {
	id: string;
	handler: KeyBindingHandler;
	priority: number;
	enabled?: () => boolean;
}

interface KeyBindingContextValue {
	/**
	 * Register a key binding handler
	 * Returns an unregister function
	 */
	register: (
		handler: KeyBindingHandler,
		options: KeyBindingOptions,
	) => () => void;

	/**
	 * Dispatch a key press to all registered handlers
	 * Returns true if any handler consumed the event
	 */
	dispatch: (keyPress: KeyPress) => boolean;
}

const KeyBindingContext = createContext<KeyBindingContextValue | null>(null);

export function KeyBindingProvider({children}: {children: React.ReactNode}) {
	const handlersRef = useRef<Map<string, KeyBindingEntry>>(new Map());

	const register = useCallback(
		(handler: KeyBindingHandler, options: KeyBindingOptions) => {
			const entry: KeyBindingEntry = {
				id: options.id,
				handler,
				priority: options.priority ?? 0,
				enabled: options.enabled,
			};

			handlersRef.current.set(options.id, entry);

			// Return unregister function
			return () => {
				handlersRef.current.delete(options.id);
			};
		},
		[],
	);

	const dispatch = useCallback((keyPress: KeyPress): boolean => {
		// Sort handlers by priority (higher first)
		const sortedHandlers = Array.from(handlersRef.current.values()).sort(
			(a, b) => b.priority - a.priority,
		);

		for (const entry of sortedHandlers) {
			// Check if handler is enabled
			if (entry.enabled && !entry.enabled()) {
				continue;
			}

			// Call handler - if it returns true, stop propagation
			const consumed = entry.handler(keyPress);
			if (consumed === true) {
				return true;
			}
		}

		return false;
	}, []);

	const value: KeyBindingContextValue = {
		register,
		dispatch,
	};

	return (
		<KeyBindingContext.Provider value={value}>
			{children}
		</KeyBindingContext.Provider>
	);
}

/**
 * Hook to access the key binding context
 */
export function useKeyBindingContext(): KeyBindingContextValue {
	const context = useContext(KeyBindingContext);
	if (!context) {
		throw new Error(
			'useKeyBindingContext must be used within KeyBindingProvider',
		);
	}
	return context;
}
