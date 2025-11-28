import {Box, Text, useFocus, useInput} from 'ink';
import TextInput from 'ink-text-input';
import Spinner from 'ink-spinner';
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useTheme} from '@/hooks/useTheme';
import {promptHistory} from '@/prompt-history';
import {commandRegistry} from '@/commands';
import {useResponsiveTerminal} from '@/hooks/useTerminalWidth';
import {useUIStateContext} from '@/hooks/useUIState';
import {useInputState} from '@/hooks/useInputState';
import {assemblePrompt} from '@/utils/prompt-processor';
import {Completion} from '@/types/index';
import {DevelopmentMode} from '@/types/core';
import {readWeekTasks, writeWeekTasks, getNextTaskNumber} from '@/utils/tasks';
import {Task, TaskState} from '@/types/tasks';
import StatusBar from '@/components/status-bar';
import CommandList from '@/components/command-list';
import RoutinesList from '@/components/routines-list';
import {getRoutineNames} from '@/utils/routines';

interface ChatProps {
	onSubmit?: (message: string) => void;
	placeholder?: string;
	customCommands?: string[]; // List of custom command names and aliases
	disabled?: boolean; // Disable input when AI is processing
	onCancel?: () => void; // Callback when user presses escape while thinking
	onToggleMode?: () => void; // Callback when user presses shift+tab to toggle development mode
	developmentMode?: DevelopmentMode; // Current development mode
	mcpStatus?: string | null; // MCP connection status
	isIncognitoMode?: boolean; // Incognito mode status
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
	isIncognitoMode = false,
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

	// Routine state
	const [availableRoutines, setAvailableRoutines] = useState<string[]>([]);
	const [selectedRoutineIndex, setSelectedRoutineIndex] = useState(0);
	const [showRoutines, setShowRoutines] = useState(false);
	const [loadingRoutines, setLoadingRoutines] = useState(false);

	// Task mode state
	const [isTaskMode, setIsTaskMode] = useState<boolean>(false);
	const [taskAddedMessage, setTaskAddedMessage] = useState<string>('');
	const [taskRefreshKey, setTaskRefreshKey] = useState<number>(0);

	// Responsive placeholder text
	const defaultPlaceholder = isNarrow
		? 'Type "What shall we work on today?"'
		: 'Type "What shall we work on today?';
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

	// Check if we're in routine mode (input contains @ followed by optional letters)
	const routineMatch = input.match(/@(\w*)$/);
	const isRoutineMode = routineMatch !== null;
	const routinePrefix = routineMatch?.[1] ?? '';

	// Detect if user types "--" to enter task mode
	useEffect(() => {
		if (input === '--' && !isTaskMode) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setIsTaskMode(true);
			// Use setInputState to bypass paste detection when clearing
			setInputState({
				displayValue: '',
				placeholderContent: currentState.placeholderContent,
			});
		}
	}, [input, isTaskMode, currentState, setInputState]);

	// Load history on mount
	useEffect(() => {
		void promptHistory.loadHistory();
	}, []);

	// Load routines when @ is typed
	useEffect(() => {
		if (isRoutineMode && availableRoutines.length === 0 && !loadingRoutines) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setLoadingRoutines(true);
			void getRoutineNames().then(routines => {
				setAvailableRoutines(routines);
				setLoadingRoutines(false);
				setShowRoutines(true);
			});
		} else if (isRoutineMode && availableRoutines.length > 0) {
			setShowRoutines(true);
		} else if (!isRoutineMode && showRoutines) {
			setShowRoutines(false);
			setSelectedRoutineIndex(0);
		}
	}, [isRoutineMode, availableRoutines.length, loadingRoutines, showRoutines]);

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

	// Calculate filtered routines based on prefix
	const filteredRoutines = useMemo(() => {
		if (!isRoutineMode || loadingRoutines) {
			return [];
		}

		if (routinePrefix.length === 0) {
			return availableRoutines;
		}

		return availableRoutines.filter(routine =>
			routine.toLowerCase().includes(routinePrefix.toLowerCase()),
		);
	}, [isRoutineMode, loadingRoutines, routinePrefix, availableRoutines]);

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
	const handleSubmit = useCallback(async () => {
		// If in task mode, add the task directly
		if (isTaskMode && input.trim()) {
			try {
				const tasks = await readWeekTasks();
				const taskNumber = getNextTaskNumber(tasks);

				const newTask: Task = {
					number: taskNumber,
					description: input.trim(),
					state: TaskState.TODO,
					tags: [],
				};

				tasks.push(newTask);
				await writeWeekTasks(tasks);

				setTaskAddedMessage(`Task #${taskNumber} added successfully!`);
				setTimeout(() => setTaskAddedMessage(''), 3000);
				setTaskRefreshKey(prev => prev + 1);

				resetInput();
				setIsTaskMode(false);
				setTextInputKey(prev => prev + 1);
			} catch (error) {
				setTaskAddedMessage(
					`Failed to add task: ${
						error instanceof Error ? error.message : 'Unknown error'
					}`,
				);
				setTimeout(() => setTaskAddedMessage(''), 3000);
			}
			return;
		}

		// If routine completions are showing, auto-complete to selected routine
		if (showRoutines && filteredRoutines.length > 0 && isRoutineMode) {
			const selectedRoutine = filteredRoutines[selectedRoutineIndex];
			// Replace @prefix with @routineName and add space
			const beforeAt = input.substring(0, input.lastIndexOf('@'));
			const completedText = `${beforeAt}@${selectedRoutine} `;
			setInputState({
				displayValue: completedText,
				placeholderContent: currentState.placeholderContent,
			});
			setShowRoutines(false);
			setTextInputKey(prev => prev + 1);
			return;
		}

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
		isTaskMode,
		showRoutines,
		filteredRoutines,
		selectedRoutineIndex,
		isRoutineMode,
		setInputState,
	]);

	// Handle escape key logic
	const handleEscape = useCallback(() => {
		// If in task mode, exit task mode first
		if (isTaskMode) {
			setIsTaskMode(false);
			resetInput();
			setTextInputKey(prev => prev + 1);
			focus('user-input');
			return;
		}

		if (showClearMessage) {
			resetInput();
			resetUIState();
			focus('user-input');
		} else {
			setShowClearMessage(true);
		}
	}, [
		showClearMessage,
		resetInput,
		resetUIState,
		setShowClearMessage,
		focus,
		isTaskMode,
	]);

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

		// Ctrl+U (or Cmd+Delete on Mac) - Clear line
		if (key.ctrl && inputChar === 'u') {
			// Remove the 'u' that was just added by checking if input ends with 'u'
			const targetState = {
				displayValue: '',
				placeholderContent: {},
			};

			setTextInputKey(prev => prev + 1);

			// Use setTimeout to ensure state is applied after TextInput processes the key
			queueMicrotask(() => {
				setInputState(targetState);
			});
			return;
		}

		// Ctrl+W (or Option+Delete on Mac) - Delete last word
		if (key.ctrl && inputChar === 'w') {
			// Split only the displayValue, not the full input with placeholders
			const words = currentState.displayValue.trimEnd().split(/\s+/);
			let targetState;
			if (words.length > 1) {
				words.pop();
				const newDisplayValue = words.join(' ') + ' ';
				targetState = {
					displayValue: newDisplayValue,
					placeholderContent: currentState.placeholderContent,
				};
			} else {
				targetState = {
					displayValue: '',
					placeholderContent: currentState.placeholderContent,
				};
			}
			setTextInputKey(prev => prev + 1);

			// Use setTimeout to ensure state is applied after TextInput processes the key
			queueMicrotask(() => {
				setInputState(targetState);
			});
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
			// Routine completion
			if (isRoutineMode && !loadingRoutines && filteredRoutines.length > 0) {
				const selectedRoutine = filteredRoutines[selectedRoutineIndex];
				// Replace @prefix with @routineName
				const beforeAt = input.substring(0, input.lastIndexOf('@'));
				const completedText = `${beforeAt}@${selectedRoutine} `;
				setInputState({
					displayValue: completedText,
					placeholderContent: currentState.placeholderContent,
				});
				setShowRoutines(false);
				setTextInputKey(prev => prev + 1);
				return;
			}

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
			// Routine navigation takes priority when routines are showing
			if (showRoutines && filteredRoutines.length > 0) {
				setSelectedRoutineIndex(prev =>
					prev > 0 ? prev - 1 : filteredRoutines.length - 1,
				);
				return;
			}

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
			// Routine navigation takes priority when routines are showing
			if (showRoutines && filteredRoutines.length > 0) {
				setSelectedRoutineIndex(prev =>
					prev < filteredRoutines.length - 1 ? prev + 1 : 0,
				);
				return;
			}

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

	// Update placeholder for task mode
	const taskModePlaceholder = 'Enter task description...';
	const currentPlaceholder = isTaskMode
		? taskModePlaceholder
		: actualPlaceholder;

	// Update prompt symbol based on mode
	const promptSymbol = isTaskMode ? '--' : '>';

	return (
		<Box flexDirection="column" paddingY={1} width="100%" marginTop={0}>
			<Box
				flexDirection="column"
				borderStyle={isBashMode || isTaskMode ? 'round' : undefined}
				borderColor={
					isBashMode ? colors.tool : isTaskMode ? colors.success : undefined
				}
				paddingX={isBashMode || isTaskMode ? 1 : 0}
				width={isBashMode || isTaskMode ? boxWidth : undefined}
			>
				{/* Input row */}
				<Box
					borderLeft={false}
					borderRight={false}
					borderBottom
					borderColor={colors.white}
					borderDimColor
					borderStyle="round"
				>
					<Text color={isTaskMode ? colors.success : textColor}>
						{promptSymbol}{' '}
					</Text>
					{disabled ? (
						<Text color={colors.secondary}>...</Text>
					) : (
						<TextInput
							key={textInputKey}
							value={input}
							onChange={updateInput}
							// eslint-disable-next-line @typescript-eslint/no-misused-promises
							onSubmit={handleSubmit}
							placeholder={currentPlaceholder}
							focus={isFocused}
						/>
					)}
				</Box>

				{isBashMode && (
					<Text color={colors.tool} dimColor>
						Bash Mode
					</Text>
				)}
				{isTaskMode && (
					<Text color={colors.success} dimColor>
						Task Mode - Press ESC to exit
					</Text>
				)}
				{taskAddedMessage && (
					<Text color={colors.success}>{taskAddedMessage}</Text>
				)}
				{showClearMessage && (
					<Text color={colors.white} dimColor>
						Press escape again to clear
					</Text>
				)}
				{showCompletions && completions.length > 0 && (
					<CommandList
						completions={completions}
						selectedIndex={selectedCommandIndex}
						maxVisible={5}
					/>
				)}
				{loadingRoutines && (
					<Text color={colors.white}>
						<Spinner type="dots2" /> Loading routines...
					</Text>
				)}
				{showRoutines && filteredRoutines.length > 0 && (
					<RoutinesList
						routines={filteredRoutines}
						selectedIndex={selectedRoutineIndex}
						maxVisible={5}
					/>
				)}
			</Box>

			{/* Status bar with development mode, MCP status, and task counts */}
			<StatusBar
				key={taskRefreshKey}
				developmentMode={developmentMode}
				mcpStatus={mcpStatus}
				isIncognitoMode={isIncognitoMode}
			/>
		</Box>
	);
}
