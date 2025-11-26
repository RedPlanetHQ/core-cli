import {Box, Text, useFocus, useInput} from 'ink';
import TextInput from 'ink-text-input';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTheme} from '@/hooks/useTheme';
import {promptHistory} from '@/prompt-history';
import {commandRegistry} from '@/commands';
import {useResponsiveTerminal} from '@/hooks/useTerminalWidth';
import {useUIStateContext} from '@/hooks/useUIState';
import {useInputState} from '@/hooks/useInputState';
import {assemblePrompt} from '@/utils/prompt-processor';
import {Completion} from '@/types/index';
import {DevelopmentMode, DEVELOPMENT_MODE_LABELS} from '@/types/core';

interface ChatProps {
	onSubmit?: (message: string) => void;
	placeholder?: string;
	customCommands?: string[]; // List of custom command names and aliases
	disabled?: boolean; // Disable input when AI is processing
	onCancel?: () => void; // Callback when user presses escape while thinking
	onToggleMode?: () => void; // Callback when user presses shift+tab to toggle development mode
	developmentMode?: DevelopmentMode; // Current development mode
	mcpStatus?: string | null; // MCP connection status
}

export default function UserInput({
	onSubmit,
	placeholder,
	customCommands = [],
	disabled = false,
	onCancel,
	onToggleMode,
	developmentMode = 'normal',
	mcpStatus = null,
}: ChatProps) {
	const {isFocused, focus} = useFocus({autoFocus: !disabled, id: 'user-input'});
	const {colors} = useTheme();
	const inputState = useInputState();
	const uiState = useUIStateContext();
	const {boxWidth, isNarrow} = useResponsiveTerminal();
	const [textInputKey, setTextInputKey] = useState(0);
	// Store the original InputState (including placeholders) when starting history navigation
	const [originalInputState, setOriginalInputState] = useState<
		typeof inputState.currentState | null
	>(null);

	// Command navigation state
	const [selectedCommandIndex, setSelectedCommandIndex] = useState(0);

	// Responsive placeholder text
	const defaultPlaceholder = isNarrow
		? '/ for commands, ! for bash, ↑/↓ history'
		: 'Type `/` and then press Tab for command suggestions or `!` to execute bash commands. Use ↑/↓ for history.';
	const actualPlaceholder = placeholder ?? defaultPlaceholder;

	const {
		input,
		originalInput,
		historyIndex,
		setOriginalInput,
		setHistoryIndex,
		updateInput,
		resetInput,
		// New paste handling functions
		undo,
		redo,
		deletePlaceholder: _deletePlaceholder,
		currentState,
		setInputState,
	} = inputState;

	const {
		showClearMessage,
		showCompletions,
		completions,
		setShowClearMessage,
		setShowCompletions,
		setCompletions,
		resetUIState,
	} = uiState;

	// Check if we're in bash mode (input starts with !)
	const isBashMode = input.trim().startsWith('!');

	// Check if we're in command mode (input starts with /)
	const isCommandMode = input.trim().startsWith('/');

	// Load history on mount
	useEffect(() => {
		void promptHistory.loadHistory();
	}, []);

	// Calculate command completions using useMemo to prevent flashing
	const commandCompletions = useMemo(() => {
		if (!isCommandMode) {
			return [];
		}

		const commandPrefix = input.slice(1).split(' ')[0];

		// Show all commands when input is just "/"
		if (commandPrefix.length === 0) {
			const allBuiltIn = commandRegistry.getAll().map(cmd => ({
				name: cmd.name,
				isCustom: false,
			}));
			const allCustom = customCommands.map(cmd => ({
				name: cmd,
				isCustom: true,
			}));
			return [...allBuiltIn, ...allCustom] as Completion[];
		}

		const builtInCompletions = commandRegistry.getCompletions(commandPrefix);
		const customCompletions = customCommands
			.filter(cmd => {
				return cmd.toLowerCase().includes(commandPrefix.toLowerCase());
			})
			.sort((a, b) => a.localeCompare(b));

		return [
			...builtInCompletions.map(cmd => ({name: cmd, isCustom: false})),
			...customCompletions.map(cmd => ({name: cmd, isCustom: true})),
		] as Completion[];
	}, [input, isCommandMode, customCommands]);

	// Update UI state for command completions
	useEffect(() => {
		if (commandCompletions.length > 0) {
			setCompletions(commandCompletions);
			setShowCompletions(true);
		} else if (showCompletions) {
			setCompletions([]);
			setShowCompletions(false);
		}
	}, [commandCompletions, showCompletions, setCompletions, setShowCompletions]);

	// Helper functions

	// Handle form submission
	const handleSubmit = useCallback(() => {
		// If command completions are showing, auto-complete to selected command instead of submitting
		if (
			showCompletions &&
			completions.length > 0 &&
			input.startsWith('/') &&
			onSubmit
		) {
			const completion = completions[selectedCommandIndex];
			const completedText = `/${completion.name} `;
			const fullMessage = assemblePrompt({
				displayValue: completedText,
				placeholderContent: currentState.placeholderContent,
			});

			promptHistory.addPrompt(currentState);
			onSubmit(fullMessage);
			resetInput();
			resetUIState();
			promptHistory.resetIndex();

			return;
		}

		if (input.trim() && onSubmit) {
			// Assemble the full prompt by replacing placeholders with content
			const fullMessage = assemblePrompt(currentState);

			// Save the InputState to history and send assembled message to AI
			promptHistory.addPrompt(currentState);
			onSubmit(fullMessage);
			resetInput();
			resetUIState();
			promptHistory.resetIndex();
		}
	}, [
		input,
		onSubmit,
		resetInput,
		resetUIState,
		currentState,
		showCompletions,
		completions,
		selectedCommandIndex,
	]);

	// Handle escape key logic
	const handleEscape = useCallback(() => {
		if (showClearMessage) {
			resetInput();
			resetUIState();
			focus('user-input');
		} else {
			setShowClearMessage(true);
		}
	}, [showClearMessage, resetInput, resetUIState, setShowClearMessage, focus]);

	// History navigation
	const handleHistoryNavigation = useCallback(
		(direction: 'up' | 'down') => {
			const history = promptHistory.getHistory();
			if (history.length === 0) return;

			if (direction === 'up') {
				if (historyIndex === -1) {
					// Save the full current state (including placeholders) before starting navigation
					setOriginalInputState(currentState);
					setOriginalInput(input);
					setHistoryIndex(history.length - 1);
					setInputState(history[history.length - 1]);
					setTextInputKey(prev => prev + 1);
				} else if (historyIndex > 0) {
					const newIndex = historyIndex - 1;
					setHistoryIndex(newIndex);
					setInputState(history[newIndex]);
					setTextInputKey(prev => prev + 1);
				} else {
					// Clear when going past the first history item
					setHistoryIndex(-2);
					setOriginalInput('');
					updateInput('');
					setTextInputKey(prev => prev + 1);
				}
			} else {
				if (historyIndex >= 0 && historyIndex < history.length - 1) {
					const newIndex = historyIndex + 1;
					setHistoryIndex(newIndex);
					setInputState(history[newIndex]);
					setTextInputKey(prev => prev + 1);
				} else if (historyIndex === history.length - 1) {
					// Restore the full original state (including placeholders)
					setHistoryIndex(-1);
					if (originalInputState) {
						setInputState(originalInputState);
						setOriginalInputState(null);
					} else {
						updateInput(originalInput);
					}
					setOriginalInput('');
					setTextInputKey(prev => prev + 1);
				} else if (historyIndex === -2) {
					// Restore the original input state when pressing down from the empty state
					setHistoryIndex(-1);
					if (originalInputState) {
						setInputState(originalInputState);
						setOriginalInputState(null);
					} else {
						updateInput(originalInput);
					}
					setOriginalInput('');
					setTextInputKey(prev => prev + 1);
				}
			}
		},
		[
			historyIndex,
			input,
			originalInput,
			currentState,
			originalInputState,
			setHistoryIndex,
			setOriginalInput,
			setInputState,
			updateInput,
		],
	);

	useInput((inputChar, key) => {
		// DEBUG: Log all key presses to help debug keyboard shortcuts
		// Uncomment this to see what keys are being received
		// console.log('Key pressed:', {
		// 	inputChar,
		// 	key,
		// 	charCode: inputChar?.charCodeAt(0),
		// });

		// Handle escape for cancellation even when disabled
		if (key.escape && disabled && onCancel) {
			onCancel();
			return;
		}

		// Handle shift+tab to toggle development mode (always available)
		if (key.tab && key.shift && onToggleMode) {
			onToggleMode();
			return;
		}

		// Block all other input when disabled
		if (disabled) {
			return;
		}

		// Handle special keys
		if (key.escape) {
			handleEscape();
			return;
		}

		// Undo: Ctrl+_ (Ctrl+Shift+-)
		if (key.ctrl && inputChar === '_') {
			undo();
			return;
		}

		// Redo: Ctrl+Y
		if (key.ctrl && inputChar === 'y') {
			redo();
			return;
		}

		// Handle Tab key
		if (key.tab) {
			// Command completion - use pre-calculated commandCompletions
			if (input.startsWith('/')) {
				if (commandCompletions.length === 1) {
					// Auto-complete when there's exactly one match
					const completion = commandCompletions[0];
					const completedText = `/${completion.name} `;
					// Use setInputState to bypass paste detection for autocomplete
					setInputState({
						displayValue: completedText,
						placeholderContent: currentState.placeholderContent,
					});
					setShowCompletions(false);
					setTextInputKey(prev => prev + 1);
				} else if (commandCompletions.length > 1) {
					// If completions are already showing, autocomplete to the selected result
					if (showCompletions && completions.length > 0) {
						const completion = completions[selectedCommandIndex];
						const completedText = `/${completion.name} `;
						// Use setInputState to bypass paste detection for autocomplete
						setInputState({
							displayValue: completedText,
							placeholderContent: currentState.placeholderContent,
						});
						setShowCompletions(false);
						setTextInputKey(prev => prev + 1);
					} else {
						// Show completions when there are multiple matches
						setCompletions(commandCompletions);
						setShowCompletions(true);
					}
				}
				return;
			}
		}

		// Clear clear message on other input
		if (showClearMessage) {
			setShowClearMessage(false);
			focus('user-input');
		}

		// Handle return keys for multiline input
		// Support Shift+Enter if the terminal sends it properly
		if (key.return && key.shift) {
			updateInput(input + '\n');
			return;
		}

		// VSCode terminal sends Option+Enter as '\r' with key.return === false
		// Regular Enter in VSCode sends '\r' with key.return === true
		// So we use key.return to distinguish: false = multiline, true = submit
		if (inputChar === '\r' && !key.return) {
			updateInput(input + '\n');
			return;
		}

		// Handle navigation
		if (key.upArrow) {
			// Command navigation takes priority when completions are showing
			if (showCompletions && completions.length > 0) {
				setSelectedCommandIndex(prev =>
					prev > 0 ? prev - 1 : completions.length - 1,
				);
				return;
			}

			handleHistoryNavigation('up');
			return;
		}

		if (key.downArrow) {
			// Command navigation takes priority when completions are showing
			if (showCompletions && completions.length > 0) {
				setSelectedCommandIndex(prev =>
					prev < completions.length - 1 ? prev + 1 : 0,
				);
				return;
			}

			handleHistoryNavigation('down');
			return;
		}
	});

	const textColor = disabled || !input ? colors.secondary : colors.primary;

	return (
		<Box flexDirection="column" paddingY={1} width="100%" marginTop={0}>
			<Box
				flexDirection="column"
				borderStyle={isBashMode ? 'round' : undefined}
				borderColor={isBashMode ? colors.tool : undefined}
				paddingX={isBashMode ? 1 : 0}
				width={isBashMode ? boxWidth : undefined}
			>
				{!isBashMode && (
					<>
						<Text color={colors.primary}>
							{disabled ? '' : 'What would you like me to help with?'}
						</Text>
					</>
				)}

				{/* Input row */}
				<Box>
					<Text color={textColor}>{'>'} </Text>
					{disabled ? (
						<Text color={colors.secondary}>...</Text>
					) : (
						<TextInput
							key={textInputKey}
							value={input}
							onChange={updateInput}
							onSubmit={handleSubmit}
							placeholder={actualPlaceholder}
							focus={isFocused}
						/>
					)}
				</Box>

				{isBashMode && (
					<Text color={colors.tool} dimColor>
						Bash Mode
					</Text>
				)}
				{showClearMessage && (
					<Text color={colors.white} dimColor>
						Press escape again to clear
					</Text>
				)}
				{showCompletions && completions.length > 0 && (
					<Box flexDirection="column" marginTop={1}>
						<Text color={colors.white}>
							Available commands (↑/↓ to navigate, Tab to select):
						</Text>
						{completions.map((completion, index) => (
							<Text
								key={index}
								color={completion.isCustom ? colors.white : colors.white}
								bold={index === selectedCommandIndex}
							>
								{index === selectedCommandIndex ? '▸ ' : '  '}/{completion.name}
							</Text>
						))}
					</Box>
				)}
			</Box>

			{/* Development mode indicator and MCP status - always visible */}
			<Box marginTop={1} flexDirection="row" gap={2}>
				<Text
					color={
						developmentMode === 'normal'
							? colors.secondary
							: developmentMode === 'auto-accept'
							? colors.info
							: colors.warning
					}
				>
					<Text bold>{DEVELOPMENT_MODE_LABELS[developmentMode]}</Text>{' '}
					<Text dimColor>(Shift+Tab to cycle)</Text>
				</Text>
				{mcpStatus && (
					<Text
						color={
							mcpStatus.includes('Failed')
								? colors.error
								: mcpStatus.includes('Connected')
								? colors.success
								: colors.info
						}
					>
						{mcpStatus}
					</Text>
				)}
			</Box>
		</Box>
	);
}
