import {
	Message,
	LLMClient,
	DevelopmentMode,
	ToolCall,
	ToolResult,
} from '@/types/core';
import {processToolUse, getToolManager} from '@/message-handler';
import {ConversationContext} from '@/hooks/useAppState';
import {displayToolResult} from '@/utils/tool-result-display';
import {parseToolArguments} from '@/utils/tool-args-parser';
import {createCancellationResults} from '@/utils/tool-cancellation';
import InfoMessage from '@/components/info-message';
import ErrorMessage from '@/components/error-message';
import React from 'react';

interface UseToolHandlerProps {
	pendingToolCalls: ToolCall[];
	currentToolIndex: number;
	completedToolResults: ToolResult[];
	currentConversationContext: ConversationContext | null;
	setPendingToolCalls: (calls: ToolCall[]) => void;
	setCurrentToolIndex: (index: number) => void;
	setCompletedToolResults: (results: ToolResult[]) => void;
	setCurrentConversationContext: (context: ConversationContext | null) => void;
	setIsToolConfirmationMode: (mode: boolean) => void;
	setIsToolExecuting: (executing: boolean) => void;
	setMessages: (messages: Message[]) => void;
	addToChatQueue: (component: React.ReactNode) => void;
	componentKeyCounter: number;
	resetToolConfirmationState: () => void;
	onProcessAssistantResponse: (
		systemMessage: Message,
		messages: Message[],
	) => Promise<void>;
	client?: LLMClient | null;
	currentProvider?: string;
	setDevelopmentMode?: (mode: DevelopmentMode) => void;
}

export function useToolHandler({
	pendingToolCalls,
	currentToolIndex,
	completedToolResults,
	currentConversationContext,
	setPendingToolCalls,
	setCurrentToolIndex,
	setCompletedToolResults,
	setCurrentConversationContext,
	setIsToolConfirmationMode,
	setIsToolExecuting,
	setMessages,
	addToChatQueue,
	componentKeyCounter,
	resetToolConfirmationState,
	onProcessAssistantResponse,
	client: _client,
	currentProvider: _currentProvider,
	setDevelopmentMode,
}: UseToolHandlerProps) {
	// Continue conversation with tool results - maintains the proper loop
	const continueConversationWithToolResults = async (
		toolResults?: ToolResult[],
	) => {
		if (!currentConversationContext) {
			resetToolConfirmationState();
			return;
		}

		// Use passed results or fallback to state (for backwards compatibility)
		const resultsToUse = toolResults || completedToolResults;

		const {updatedMessages, assistantMsg, systemMessage} =
			currentConversationContext;

		// Format tool results as standard tool messages
		const toolMessages = resultsToUse.map(result => ({
			role: 'tool' as const,
			content: result.content || '',
			tool_call_id: result.tool_call_id,
			name: result.name,
		}));

		// Update conversation history with tool results
		// The assistantMsg is NOT included in updatedMessages (updatedMessages is the state before adding assistantMsg)
		// We need to add both the assistant message and the tool results
		const updatedMessagesWithTools = [
			...updatedMessages,
			assistantMsg, // Add the assistant message with tool_calls intact for proper tool_call_id matching
			...toolMessages,
		];
		setMessages(updatedMessagesWithTools);

		// Reset tool confirmation state since we're continuing the conversation
		resetToolConfirmationState();

		// Continue the main conversation loop with tool results as context
		await onProcessAssistantResponse(systemMessage, updatedMessagesWithTools);
	};

	// Handle tool confirmation
	const handleToolConfirmation = (confirmed: boolean) => {
		if (!confirmed) {
			// User cancelled - show message
			addToChatQueue(
				<InfoMessage
					key={`tool-cancelled-${componentKeyCounter}`}
					message="Tool execution cancelled by user"
					hideBox={true}
				/>,
			);

			if (!currentConversationContext) {
				resetToolConfirmationState();
				return;
			}

			// Create cancellation results for all pending tools
			// This is critical to maintain conversation state integrity
			const cancellationResults = createCancellationResults(pendingToolCalls);

			const {updatedMessages, assistantMsg} = currentConversationContext;

			// Format tool results as standard tool messages
			const toolMessages = cancellationResults.map(result => ({
				role: 'tool' as const,
				content: result.content || '',
				tool_call_id: result.tool_call_id,
				name: result.name,
			}));

			// Update conversation history with the assistant message + cancellation results
			// This prevents the "mismatch" error on the next user message
			const updatedMessagesWithCancellation = [
				...updatedMessages,
				assistantMsg, // Add the assistant message with tool_calls
				...toolMessages, // Add cancellation results
			];
			setMessages(updatedMessagesWithCancellation);

			// Reset state to allow user to type a new message
			// Do NOT continue the conversation - let the user provide instructions
			resetToolConfirmationState();
			return;
		}

		// Move to tool execution state - this allows UI to update immediately
		setIsToolConfirmationMode(false);
		setIsToolExecuting(true);

		// Execute tools asynchronously
		setImmediate(() => {
			void executeCurrentTool();
		});
	};

	// Execute the current tool asynchronously
	const executeCurrentTool = async () => {
		const currentTool = pendingToolCalls[currentToolIndex];

		// Check if this is an MCP tool and show appropriate messaging
		const toolManager = getToolManager();
		if (toolManager) {
			const mcpInfo = toolManager.getMCPToolInfo(currentTool.function.name);
			if (mcpInfo.isMCPTool) {
				addToChatQueue(
					<InfoMessage
						key={`mcp-tool-executing-${componentKeyCounter}-${Date.now()}`}
						message={`Executing MCP tool "${currentTool.function.name}" from server "${mcpInfo.serverName}"`}
						hideBox={true}
					/>,
				);
			}

			// Run validator if available
			const validator = toolManager.getToolValidator(currentTool.function.name);
			if (validator) {
				try {
					const parsedArgs = parseToolArguments(currentTool.function.arguments);

					const validationResult = await validator(parsedArgs);
					if (!validationResult.valid) {
						// Validation failed - show error and skip execution
						const errorResult = {
							tool_call_id: currentTool.id,
							role: 'tool' as const,
							name: currentTool.function.name,
							content: validationResult.error,
						};

						const newResults = [...completedToolResults, errorResult];
						setCompletedToolResults(newResults);

						// Display the error
						addToChatQueue(
							<ErrorMessage
								key={`tool-validation-error-${componentKeyCounter}-${Date.now()}`}
								message={validationResult.error}
								hideBox={true}
							/>,
						);

						// Move to next tool or complete the process
						if (currentToolIndex + 1 < pendingToolCalls.length) {
							setCurrentToolIndex(currentToolIndex + 1);
							// Return to confirmation mode for next tool
							setIsToolExecuting(false);
							setIsToolConfirmationMode(true);
						} else {
							// All tools processed, continue conversation loop with the results
							setIsToolExecuting(false);
							await continueConversationWithToolResults(newResults);
						}
						return;
					}
				} catch (validationError) {
					// Validation threw an error - treat as validation failure
					const errorResult = {
						tool_call_id: currentTool.id,
						role: 'tool' as const,
						name: currentTool.function.name,
						content: `Validation error: ${
							validationError instanceof Error
								? validationError.message
								: String(validationError)
						}`,
					};

					const newResults = [...completedToolResults, errorResult];
					setCompletedToolResults(newResults);

					addToChatQueue(
						<ErrorMessage
							key={`tool-validation-error-${componentKeyCounter}-${Date.now()}`}
							message={`Validation error: ${String(validationError)}`}
							hideBox={true}
						/>,
					);

					// Move to next tool or complete the process
					if (currentToolIndex + 1 < pendingToolCalls.length) {
						setCurrentToolIndex(currentToolIndex + 1);
						setIsToolExecuting(false);
						setIsToolConfirmationMode(true);
					} else {
						setIsToolExecuting(false);
						await continueConversationWithToolResults(newResults);
					}
					return;
				}
			}
		}

		try {
			// Special handling for switch_mode tool
			if (currentTool.function.name === 'switch_mode' && setDevelopmentMode) {
				const parsedArgs = parseToolArguments(currentTool.function.arguments);

				// Actually switch the mode
				const requestedMode = parsedArgs.mode as DevelopmentMode;
				setDevelopmentMode(requestedMode);

				addToChatQueue(
					<InfoMessage
						key={`mode-switched-${componentKeyCounter}-${Date.now()}`}
						message={`Development mode switched to: ${requestedMode.toUpperCase()}`}
						hideBox={true}
					/>,
				);
			}

			const result = await processToolUse(currentTool);

			const newResults = [...completedToolResults, result];
			setCompletedToolResults(newResults);

			// Display the tool result
			await displayToolResult(
				currentTool,
				result,
				toolManager,
				addToChatQueue,
				componentKeyCounter,
			);

			// Move to next tool or complete the process
			if (currentToolIndex + 1 < pendingToolCalls.length) {
				setCurrentToolIndex(currentToolIndex + 1);
				// Return to confirmation mode for next tool
				setIsToolExecuting(false);
				setIsToolConfirmationMode(true);
			} else {
				// All tools executed, continue conversation loop with the updated results
				setIsToolExecuting(false);
				await continueConversationWithToolResults(newResults);
			}
		} catch (error) {
			setIsToolExecuting(false);
			addToChatQueue(
				<ErrorMessage
					key={`tool-exec-error-${componentKeyCounter}`}
					message={`Tool execution error: ${String(error)}`}
				/>,
			);
			resetToolConfirmationState();
		}
	};

	// Handle tool confirmation cancel
	const handleToolConfirmationCancel = () => {
		addToChatQueue(
			<InfoMessage
				key={`tool-cancelled-${componentKeyCounter}`}
				message="Tool execution cancelled by user"
				hideBox={true}
			/>,
		);

		if (!currentConversationContext) {
			resetToolConfirmationState();
			return;
		}

		// Create cancellation results for all pending tools
		// This is critical to maintain conversation state integrity
		const cancellationResults = createCancellationResults(pendingToolCalls);

		const {updatedMessages, assistantMsg} = currentConversationContext;

		// Format tool results as standard tool messages
		const toolMessages = cancellationResults.map(result => ({
			role: 'tool' as const,
			content: result.content || '',
			tool_call_id: result.tool_call_id,
			name: result.name,
		}));

		// Update conversation history with the assistant message + cancellation results
		// This prevents the "mismatch" error on the next user message
		const updatedMessagesWithCancellation = [
			...updatedMessages,
			assistantMsg, // Add the assistant message with tool_calls
			...toolMessages, // Add cancellation results
		];
		setMessages(updatedMessagesWithCancellation);

		// Reset state to allow user to type a new message
		// Do NOT continue the conversation - let the user provide instructions
		resetToolConfirmationState();
	};

	// Start tool confirmation flow
	const startToolConfirmationFlow = (
		toolCalls: ToolCall[],
		updatedMessages: Message[],
		assistantMsg: Message,
		systemMessage: Message,
	) => {
		setPendingToolCalls(toolCalls);
		setCurrentToolIndex(0);
		setCompletedToolResults([]);
		setCurrentConversationContext({
			updatedMessages,
			assistantMsg,
			systemMessage,
		});
		setIsToolConfirmationMode(true);
	};

	return {
		handleToolConfirmation,
		handleToolConfirmationCancel,
		startToolConfirmationFlow,
		continueConversationWithToolResults,
		executeCurrentTool,
	};
}
