import {LLMClient, Message, ToolCall, ToolResult} from '@/types/core';
import {ToolManager} from '@/tools/tool-manager';
import {processPromptTemplate} from '@/utils/prompt-processor';
import {parseToolCalls} from '@/tool-calling/index';
import {ConversationStateManager} from '@/app/utils/conversationState';
import {promptHistory} from '@/prompt-history';

import {displayToolResult} from '@/utils/tool-result-display';
import {parseToolArguments} from '@/utils/tool-args-parser';
import {formatError} from '@/utils/error-formatter';
import UserMessage from '@/components/user-message';
import AssistantMessage from '@/components/assistant-message';
import ErrorMessage from '@/components/error-message';
import React from 'react';
import {appConfig} from '@/config/index';
import {getCurrentSession} from '@/usage/tracker';
import {getAssistantName} from '@/config/preferences';
import {getRoutine} from '@/utils/routines';

// Normalize streaming content to prevent excessive blank lines during output
const normalizeStreamingContent = (content: string): string =>
	content
		// Strip <think>...</think> tags (some models output thinking that shouldn't be shown)
		.replace(/<think>[\s\S]*?<\/think>/gi, '')
		// Strip orphaned/incomplete think tags (during streaming)
		.replace(/<think>[\s\S]*$/gi, '')
		.replace(/<\/think>/gi, '')
		// Collapse 3+ consecutive newlines to 2 (one blank line max)
		.replace(/\n{3,}/g, '\n\n')
		// Remove leading whitespace (clean start)
		.replace(/^\s+/, '');

// Helper function to convert tool results to message format
const toolResultsToMessages = (results: ToolResult[]): Message[] =>
	results.map(result => ({
		role: 'tool' as const,
		content: result.content || '',
		tool_call_id: result.tool_call_id,
		name: result.name,
	}));

// Helper function to filter out invalid tool calls and deduplicate by ID and function
// Returns valid tool calls and error results for invalid ones
const filterValidToolCalls = (
	toolCalls: ToolCall[],
	toolManager: ToolManager | null,
): {validToolCalls: ToolCall[]; errorResults: ToolResult[]} => {
	const seenIds = new Set<string>();
	const seenFunctionCalls = new Set<string>();
	const validToolCalls: ToolCall[] = [];
	const errorResults: ToolResult[] = [];

	for (const toolCall of toolCalls) {
		// Filter out completely empty tool calls
		if (!toolCall.id || !toolCall.function?.name) {
			continue;
		}

		// Filter out tool calls with empty names
		if (toolCall.function.name.trim() === '') {
			continue;
		}

		// Filter out tool calls for tools that don't exist
		if (toolManager && !toolManager.hasTool(toolCall.function.name)) {
			errorResults.push({
				tool_call_id: toolCall.id,
				role: 'tool' as const,
				name: toolCall.function.name,
				content: `Error: Unknown tool: ${toolCall.function.name}. This tool does not exist. Please use only the tools that are available in the system.`,
			});
			continue;
		}

		// Filter out duplicate tool call IDs (GPT-5 issue)
		if (seenIds.has(toolCall.id)) {
			continue;
		}

		// Filter out functionally identical tool calls (same tool + args)
		const functionSignature = `${toolCall.function.name}:${JSON.stringify(
			toolCall.function.arguments,
		)}`;
		if (seenFunctionCalls.has(functionSignature)) {
			continue;
		}

		seenIds.add(toolCall.id);
		seenFunctionCalls.add(functionSignature);
		validToolCalls.push(toolCall);
	}

	return {validToolCalls, errorResults};
};

interface UseChatHandlerProps {
	client: LLMClient | null;
	toolManager: ToolManager | null;
	messages: Message[];
	setMessages: (messages: Message[]) => void;
	currentModel: string;
	setIsCancelling: (cancelling: boolean) => void;
	addToChatQueue: (component: React.ReactNode) => void;
	componentKeyCounter: number;
	abortController: AbortController | null;
	setAbortController: (controller: AbortController | null) => void;
	developmentMode?: 'normal' | 'auto-accept' | 'plan';
	userProfile?: string;
	integrations?: string;
	nonInteractiveMode?: boolean;

	isIncognitoMode?: boolean;
	onStartToolConfirmationFlow: (
		toolCalls: ToolCall[],
		updatedMessages: Message[],
		assistantMsg: Message,
		systemMessage: Message,
	) => void;
	onConversationComplete?: () => void;
}

export function useChatHandler({
	client,
	toolManager,
	messages,
	setMessages,
	currentModel,
	setIsCancelling,
	addToChatQueue,
	componentKeyCounter,
	abortController,
	setAbortController,
	developmentMode = 'normal',
	nonInteractiveMode = false,
	userProfile,
	integrations,
	isIncognitoMode = false,
	onStartToolConfirmationFlow,
	onConversationComplete,
}: UseChatHandlerProps) {
	// Conversation state manager for enhanced context
	const conversationStateManager = React.useRef(new ConversationStateManager());

	// State for streaming message content
	const [streamingContent, setStreamingContent] = React.useState<string>('');
	const [isStreaming, setIsStreaming] = React.useState<boolean>(false);

	// Filter out Core MCP tools that were called during initialization
	// These tools should not be exposed to the AI model

	// Function to save episode to Core API
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const saveEpisode = async (userMsg: string, assistantMsg: string) => {
		// Skip saving if in incognito mode
		if (isIncognitoMode) {
			return;
		}

		// Get session ID from tracker
		const currentSession = getCurrentSession();
		const sessionId = currentSession?.getSessionInfo().id;

		// Only save if we have auth configured and a session ID
		if (!appConfig.auth || !sessionId) {
			return;
		}

		try {
			const episodeBody = `user: ${userMsg}\n\nassistant: ${assistantMsg}`;
			const payload = {
				episodeBody,
				referenceTime: new Date().toISOString(),
				sessionId,
				source: 'cli',
			};

			await fetch(`${appConfig.auth.url}/api/v1/add`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${appConfig.auth.apiKey}`,
				},
				body: JSON.stringify(payload),
			});
		} catch (error) {
			// Silent failure - don't block conversation if episode saving fails
			console.warn('Failed to save episode to Core:', error);
		}
	};

	// Reset conversation state when messages are cleared
	React.useEffect(() => {
		if (messages.length === 0) {
			conversationStateManager.current.reset();
		}
	}, [messages.length]);

	// Helper to display errors in chat queue
	const displayError = React.useCallback(
		(error: unknown, keyPrefix: string) => {
			if (
				error instanceof Error &&
				error.message === 'Operation was cancelled'
			) {
				addToChatQueue(
					<ErrorMessage
						key={`${keyPrefix}-${componentKeyCounter}`}
						message="Interrupted by user."
						hideBox={true}
					/>,
				);
			} else {
				addToChatQueue(
					<ErrorMessage
						key={`${keyPrefix}-${componentKeyCounter}`}
						message={formatError(error)}
						hideBox={true}
					/>,
				);
			}
		},
		[addToChatQueue, componentKeyCounter],
	);

	// Helper to reset all streaming state
	const resetStreamingState = React.useCallback(() => {
		setIsCancelling(false);
		setAbortController(null);
		setIsStreaming(false);
		setStreamingContent('');
	}, [setIsCancelling, setAbortController]);

	// Process assistant response - handles the conversation loop with potential tool calls (for follow-ups)
	const processAssistantResponse = async (
		systemMessage: Message,
		messages: Message[],
	) => {
		if (!client) return;

		// Ensure we have an abort controller for this request
		let controller = abortController;
		if (!controller) {
			controller = new AbortController();
			setAbortController(controller);
		}

		const allTools = toolManager ? toolManager.getAllTools() : {};

		const filteredToolNames = [
			'memory_ingest',
			'initialize_conversation_session',
			'get_integrations',
			'memory_about_user',
		];

		const filteredTools = Object.fromEntries(
			Object.entries(allTools).filter(
				([name]) => !filteredToolNames.includes(name),
			),
		);

		try {
			// Use streaming with callbacks
			let accumulatedContent = '';

			setIsStreaming(true);
			setStreamingContent('');

			const result = await client.chat(
				[systemMessage, ...messages],
				filteredTools || {},
				{
					onToken: (token: string) => {
						accumulatedContent += token;
						setStreamingContent(normalizeStreamingContent(accumulatedContent));
					},
					onToolExecuted: (toolCall: ToolCall, result: string) => {
						// Display formatter for auto-executed tools (after execution with results)
						void (async () => {
							const toolResult: ToolResult = {
								tool_call_id: toolCall.id,
								role: 'tool' as const,
								name: toolCall.function.name,
								content: result,
							};
							await displayToolResult(
								toolCall,
								toolResult,
								toolManager,
								addToChatQueue,
								componentKeyCounter,
							);
						})();
					},
					onFinish: () => {
						setIsStreaming(false);
					},
				},
				controller.signal,
			);

			if (!result || !result.choices || result.choices.length === 0) {
				throw new Error('No response received from model');
			}

			const message = result.choices[0].message;
			const toolCalls = message.tool_calls || null;
			const fullContent = message.content || '';

			// Parse any tool calls from content for non-tool-calling models
			const parseResult = parseToolCalls(fullContent);

			// Check for malformed tool calls and send error back to model for self-correction
			if (!parseResult.success) {
				const errorContent = `${parseResult.error}\n\n${parseResult.examples}`;

				// Display error to user
				addToChatQueue(
					<ErrorMessage
						key={`malformed-tool-${Date.now()}`}
						message={errorContent}
						hideBox={true}
					/>,
				);

				// Create assistant message with the malformed content (so model knows what it said)
				const assistantMsgWithError: Message = {
					role: 'assistant',
					content: fullContent,
				};

				// Create a user message with the error feedback for the model
				const errorFeedbackMessage: Message = {
					role: 'user',
					content: `Your previous response contained a malformed tool call. ${errorContent}\n\nPlease try again using the correct format.`,
				};

				// Update messages and continue conversation loop for self-correction
				const updatedMessagesWithError = [
					...messages,
					assistantMsgWithError,
					errorFeedbackMessage,
				];
				setMessages(updatedMessagesWithError);

				// Clear streaming state before recursing
				setIsStreaming(false);
				setStreamingContent('');

				// Continue the main conversation loop with error message as context
				await processAssistantResponse(systemMessage, updatedMessagesWithError);
				return;
			}

			const parsedToolCalls = parseResult.toolCalls;
			const cleanedContent = parseResult.cleanedContent;

			// Display the assistant response (cleaned of any tool calls)
			if (cleanedContent.trim()) {
				addToChatQueue(
					<AssistantMessage
						key={`assistant-${componentKeyCounter}`}
						message={cleanedContent}
						model={currentModel}
					/>,
				);
			}

			// Merge structured tool calls from AI SDK with content-parsed tool calls
			const allToolCalls = [...(toolCalls || []), ...parsedToolCalls];

			const {validToolCalls, errorResults} = filterValidToolCalls(
				allToolCalls,
				toolManager,
			);

			// Add assistant message to conversation history only if it has content or tool_calls
			// Empty assistant messages cause API errors: "Assistant message must have either content or tool_calls"
			const assistantMsg: Message = {
				role: 'assistant',
				content: cleanedContent,
				tool_calls: validToolCalls.length > 0 ? validToolCalls : undefined,
			};

			const hasValidAssistantMessage =
				cleanedContent.trim() || validToolCalls.length > 0;

			if (hasValidAssistantMessage) {
				setMessages([...messages, assistantMsg]);

				// Update conversation state with assistant message
				conversationStateManager.current.updateAssistantMessage(assistantMsg);
			}

			// Save episode to Core API (async, non-blocking)
			// Get the last user message from the messages array
			const lastUserMessage = messages
				.slice()
				.reverse()
				.find(msg => msg.role === 'user');

			if (lastUserMessage && cleanedContent) {
				// Use original content (before routine replacement) if available
				const userContent = lastUserMessage._originalContent;
				void saveEpisode(userContent || '', cleanedContent);
			}

			// Clear streaming state after response is complete
			setIsStreaming(false);
			setStreamingContent('');

			// Handle error results for non-existent tools
			if (errorResults.length > 0) {
				// Display error messages to user
				for (const error of errorResults) {
					addToChatQueue(
						<ErrorMessage
							key={`unknown-tool-${error.tool_call_id}-${Date.now()}`}
							message={error.content}
							hideBox={true}
						/>,
					);
				}

				// Send error results back to model for self-correction
				const updatedMessagesWithError = [
					...messages,
					assistantMsg,
					...toolResultsToMessages(errorResults),
				];
				setMessages(updatedMessagesWithError);

				// Continue the main conversation loop with error messages as context
				await processAssistantResponse(systemMessage, updatedMessagesWithError);
				return;
			}

			// Handle tool calls if present - this continues the loop
			if (validToolCalls && validToolCalls.length > 0) {
				// In Plan Mode, block file modification tools
				if (developmentMode === 'plan') {
					const fileModificationTools = [
						'create_file',
						'delete_lines',
						'insert_lines',
						'replace_lines',
					];
					const blockedTools = validToolCalls.filter(tc =>
						fileModificationTools.includes(tc.function.name),
					);

					if (blockedTools.length > 0) {
						// Create error results for blocked tools
						const blockedToolErrors: ToolResult[] = blockedTools.map(
							toolCall => ({
								tool_call_id: toolCall.id,
								role: 'tool' as const,
								name: toolCall.function.name,
								content: `⚠ Tool "${toolCall.function.name}" is not allowed in Plan Mode. File modification tools are restricted in this mode. Switch to Normal Mode or Auto-accept Mode to execute file modifications.`,
							}),
						);

						// Display error messages
						for (const error of blockedToolErrors) {
							addToChatQueue(
								<ErrorMessage
									key={`plan-mode-blocked-${error.tool_call_id}-${Date.now()}`}
									message={error.content}
									hideBox={true}
								/>,
							);
						}

						// Continue conversation with error messages
						const updatedMessagesWithError = [
							...messages,
							assistantMsg,
							...toolResultsToMessages(blockedToolErrors),
						];
						setMessages(updatedMessagesWithError);

						// Continue the main conversation loop with error messages as context
						await processAssistantResponse(
							systemMessage,
							updatedMessagesWithError,
						);
						return;
					}
				}

				// Separate tools that need confirmation vs those that don't
				// Check tool's needsApproval property to determine if confirmation is needed
				const toolsNeedingConfirmation: ToolCall[] = [];
				const toolsToExecuteDirectly: ToolCall[] = [];

				for (const toolCall of validToolCalls) {
					// Check if tool has a validator
					let validationFailed = false;

					// XML validation errors are treated as validation failures
					if (toolCall.function.name === '__xml_validation_error__') {
						validationFailed = true;
					} else if (toolManager) {
						const validator = toolManager.getToolValidator(
							toolCall.function.name,
						);
						if (validator) {
							try {
								const parsedArgs = parseToolArguments(
									toolCall.function.arguments,
								);

								const validationResult = await validator(parsedArgs);
								if (!validationResult.valid) {
									validationFailed = true;
								}
							} catch {
								// Validation threw an error - treat as validation failure
								validationFailed = true;
							}
						}
					}

					// Check tool's needsApproval property from the tool definition
					let toolNeedsApproval = true; // Default to requiring approval for safety
					if (toolManager) {
						const toolEntry = toolManager.getToolEntry(toolCall.function.name);
						if (toolEntry?.tool) {
							const needsApprovalProp = (
								toolEntry.tool as unknown as {
									needsApproval?:
										| boolean
										| ((args: unknown) => boolean | Promise<boolean>);
								}
							).needsApproval;
							if (typeof needsApprovalProp === 'boolean') {
								toolNeedsApproval = needsApprovalProp;
							} else if (typeof needsApprovalProp === 'function') {
								// Evaluate function - our tools use getCurrentMode() internally
								// and don't actually need the args parameter
								try {
									const parsedArgs = parseToolArguments(
										toolCall.function.arguments,
									);
									// Cast to any to handle AI SDK type signature mismatch
									// Our tool implementations don't use the second parameter
									toolNeedsApproval = await (
										needsApprovalProp as (
											args: unknown,
										) => boolean | Promise<boolean>
									)(parsedArgs);
								} catch {
									// If evaluation fails, require approval for safety
									toolNeedsApproval = true;
								}
							}
						}
					}

					// Execute directly if:
					// 1. Validation failed (need to send error back to model)
					// 2. Tool has needsApproval: false
					// 3. In auto-accept mode (except bash which always needs approval)
					const isBashTool = toolCall.function.name === 'execute_bash';
					if (
						validationFailed ||
						!toolNeedsApproval ||
						(developmentMode === 'auto-accept' && !isBashTool)
					) {
						toolsToExecuteDirectly.push(toolCall);
					} else {
						toolsNeedingConfirmation.push(toolCall);
					}
				}

				// Execute non-confirmation tools directly
				if (toolsToExecuteDirectly.length > 0) {
					// Import processToolUse here to avoid circular dependencies
					const {processToolUse} = await import('@/message-handler');
					const directResults: ToolResult[] = [];

					for (const toolCall of toolsToExecuteDirectly) {
						try {
							// Run validator if available
							const validator = toolManager?.getToolValidator(
								toolCall.function.name,
							);
							if (validator) {
								const parsedArgs = parseToolArguments(
									toolCall.function.arguments,
								);

								const validationResult = await validator(parsedArgs);
								if (!validationResult.valid) {
									// Validation failed - create error result and skip execution
									const errorResult: ToolResult = {
										tool_call_id: toolCall.id,
										role: 'tool' as const,
										name: toolCall.function.name,
										content: validationResult.error,
									};
									directResults.push(errorResult);

									// Update conversation state with error
									conversationStateManager.current.updateAfterToolExecution(
										toolCall,
										errorResult.content,
									);

									// Display the validation error to the user
									addToChatQueue(
										<ErrorMessage
											key={`validation-error-${toolCall.id}-${Date.now()}`}
											message={validationResult.error}
											hideBox={true}
										/>,
									);

									continue; // Skip to next tool
								}
							}

							const result = await processToolUse(toolCall);
							directResults.push(result);

							// Update conversation state with tool execution
							conversationStateManager.current.updateAfterToolExecution(
								toolCall,
								result.content,
							);

							// Display the tool result immediately
							await displayToolResult(
								toolCall,
								result,
								toolManager,
								addToChatQueue,
								componentKeyCounter,
							);
						} catch (error) {
							// Handle tool execution errors
							const errorResult: ToolResult = {
								tool_call_id: toolCall.id,
								role: 'tool' as const,
								name: toolCall.function.name,
								content: `Error: ${formatError(error)}`,
							};
							directResults.push(errorResult);

							// Update conversation state with error
							conversationStateManager.current.updateAfterToolExecution(
								toolCall,
								errorResult.content,
							);

							// Display the error result
							await displayToolResult(
								toolCall,
								errorResult,
								toolManager,
								addToChatQueue,
								componentKeyCounter,
							);
						}
					}

					// If we have results, continue the conversation with them
					if (directResults.length > 0) {
						const updatedMessagesWithTools = [
							...messages,
							assistantMsg,
							...toolResultsToMessages(directResults),
						];
						setMessages(updatedMessagesWithTools);

						// Continue the main conversation loop with tool results as context
						await processAssistantResponse(
							systemMessage,
							updatedMessagesWithTools,
						);
						return;
					}
				}

				// Start confirmation flow only for tools that need it
				if (toolsNeedingConfirmation.length > 0) {
					// In non-interactive mode, exit when tool approval is required
					if (nonInteractiveMode) {
						const toolNames = toolsNeedingConfirmation
							.map(tc => tc.function.name)
							.join(', ');
						const errorMsg = `Tool approval required for: ${toolNames}. Exiting non-interactive mode`;

						// Add error message to UI
						addToChatQueue(
							<ErrorMessage
								key={`tool-approval-required-${Date.now()}`}
								message={errorMsg}
								hideBox={true}
							/>,
						);

						// Add error to messages array so exit detection can find it
						const errorMessage: Message = {
							role: 'assistant',
							content: errorMsg,
						};
						setMessages([...messages, assistantMsg, errorMessage]);

						// Signal completion to trigger exit
						if (onConversationComplete) {
							onConversationComplete();
						}
						return;
					}

					onStartToolConfirmationFlow(
						toolsNeedingConfirmation,
						messages,
						assistantMsg,
						systemMessage,
					);
				}
			}

			// If no tool calls, the conversation naturally ends here
			// BUT: if there's ALSO no content, that's likely an error - the model should have said something
			// Auto-reprompt to help the model continue
			if (validToolCalls.length === 0 && !cleanedContent.trim()) {
				// Check if we just executed tools (messages should have tool results)
				const lastMessage = messages[messages.length - 1];
				const hasRecentToolResults = lastMessage?.role === 'tool';

				// Add a continuation message to help the model respond
				// For recent tool results, ask for a summary; otherwise, ask to continue
				const nudgeContent = hasRecentToolResults
					? 'Please provide a summary or response based on the tool results above.'
					: 'Please continue with the task.';

				const nudgeMessage: Message = {
					role: 'user',
					content: nudgeContent,
				};

				// Display a "continue" message in chat so user knows what happened
				addToChatQueue(
					<UserMessage
						key={`auto-continue-${componentKeyCounter}`}
						message="continue"
					/>,
				);

				// Don't include the empty assistantMsg - it would cause API error
				// "Assistant message must have either content or tool_calls"
				const updatedMessagesWithNudge = [...messages, nudgeMessage];
				setMessages(updatedMessagesWithNudge);

				// Continue the conversation loop with the nudge
				await processAssistantResponse(systemMessage, updatedMessagesWithNudge);
				return;
			}

			if (validToolCalls.length === 0 && cleanedContent.trim()) {
				onConversationComplete?.();
			}
		} catch (error) {
			displayError(error, 'chat-error');
			// Signal completion on error to avoid hanging in non-interactive mode
			onConversationComplete?.();
		} finally {
			resetStreamingState();
		}
	};

	// Handle chat message processing
	const handleChatMessage = async (message: string) => {
		if (!client || !toolManager) return;

		// Replace @routine patterns with actual routine content before sending to LLM
		let processedMessage = message;
		const routinePattern = /@([^\s]+)/g;
		const routineMatches = [...message.matchAll(routinePattern)];

		// Fetch and replace all routines
		for (const match of routineMatches) {
			const routineName = match[1];
			const routine = getRoutine(routineName);

			if (routine) {
				// Replace @routineName with the routine content
				processedMessage = processedMessage.replace(match[0], routine.content);
			}
		}

		// For display purposes, try to get the placeholder version from history
		// This preserves the nice placeholder display in chat history
		const history = promptHistory.getHistory();
		const lastEntry = history[history.length - 1];
		const displayMessage = lastEntry?.displayValue || message;

		// Add user message to chat using display version (with placeholders)
		addToChatQueue(
			<UserMessage
				key={`user-${componentKeyCounter}`}
				message={displayMessage}
			/>,
		);

		// Add user message to conversation history using processed message (with routines replaced)
		// Store ORIGINAL message for episode saving (before routine replacement)
		const userMessage: Message = {
			role: 'user',
			content: processedMessage,
			// Store original message in metadata for episode saving
			_originalContent: message,
		};
		const updatedMessages = [...messages, userMessage];
		setMessages(updatedMessages);

		// Initialize conversation state if this is a new conversation
		if (messages.length === 0) {
			conversationStateManager.current.initializeState(message);
		}

		// Create abort controller for cancellation
		const controller = new AbortController();
		setAbortController(controller);

		try {
			// Load and process system prompt with dynamic tool documentation
			// Note: We still need tool definitions (not just native tools) for documentation
			const assistantName = getAssistantName();
			const systemPrompt = processPromptTemplate(
				{},
				userProfile,
				integrations,
				assistantName,
			);

			// Create stream request
			const systemMessage: Message = {
				role: 'system',
				content: systemPrompt,
			};

			// Use the new conversation loop
			await processAssistantResponse(systemMessage, updatedMessages);
		} catch (error) {
			if (
				error instanceof Error &&
				error.message === 'Operation was cancelled'
			) {
				addToChatQueue(
					<ErrorMessage
						key={`cancelled-${componentKeyCounter}`}
						message="Operation was cancelled by user"
						hideBox={true}
					/>,
				);
			} else {
				// Extract clean error message
				const errorMsg = formatError(error);
				addToChatQueue(
					<ErrorMessage
						key={`error-${componentKeyCounter}`}
						message={errorMsg}
					/>,
				);
			}
		} finally {
			resetStreamingState();
		}
	};

	return {
		handleChatMessage,
		processAssistantResponse,
		isStreaming,
		streamingContent,
	};
}
