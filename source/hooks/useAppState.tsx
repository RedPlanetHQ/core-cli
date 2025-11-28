import {useState, useCallback, useMemo, useEffect} from 'react';
import {LLMClient, Message, DevelopmentMode, ToolCall} from '@/types/core';
import {ToolManager} from '@/tools/tool-manager';
import {loadPreferences} from '@/config/preferences';
import {defaultTheme} from '@/config/themes';
import type {ThemePreset} from '@/types/ui';
import type {UpdateInfo, ToolResult} from '@/types/index';
import {createTokenizer} from '@/tokenization/index.js';
import type {Tokenizer} from '@/types/tokenization.js';
import React from 'react';

export interface ConversationContext {
	updatedMessages: Message[];
	assistantMsg: Message;
	systemMessage: Message;
}

export function useAppState() {
	// Initialize theme from preferences
	const preferences = loadPreferences();
	const initialTheme = preferences.selectedTheme || defaultTheme;

	const [client, setClient] = useState<LLMClient | null>(null);
	const [messages, setMessages] = useState<Message[]>([]);
	const [displayMessages, setDisplayMessages] = useState<Message[]>([]);
	const [messageTokenCache, setMessageTokenCache] = useState<
		Map<string, number>
	>(new Map());
	const [currentModel, setCurrentModel] = useState<string>('');
	const [currentProvider, setCurrentProvider] =
		useState<string>('openai-compatible');
	const [currentTheme, setCurrentTheme] = useState<ThemePreset>(initialTheme);
	const [toolManager, setToolManager] = useState<ToolManager | null>(null);
	const [startChat, setStartChat] = useState<boolean>(false);
	const [mcpInitialized, setMcpInitialized] = useState<boolean>(false);
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);

	// Core MCP initialization data
	const [userProfile, setUserProfile] = useState<string | undefined>(undefined);
	const [integrations, setIntegrations] = useState<string | undefined>(
		undefined,
	);

	// MCP connection status
	const [mcpStatus, setMcpStatus] = useState<string | null>(null);

	// Thinking indicator state
	const [isThinking, setIsThinking] = useState<boolean>(false);
	const [isCancelling, setIsCancelling] = useState<boolean>(false);

	// Cancellation state
	const [abortController, setAbortController] =
		useState<AbortController | null>(null);

	// Mode states
	const [isModelSelectionMode, setIsModelSelectionMode] =
		useState<boolean>(false);
	const [isProviderSelectionMode, setIsProviderSelectionMode] =
		useState<boolean>(false);
	const [isThemeSelectionMode, setIsThemeSelectionMode] =
		useState<boolean>(false);
	const [isNameSelectionMode, setIsNameSelectionMode] =
		useState<boolean>(false);
	const [isRecommendationsMode, setIsRecommendationsMode] =
		useState<boolean>(false);
	const [isConfigWizardMode, setIsConfigWizardMode] = useState<boolean>(false);
	const [isToolConfirmationMode, setIsToolConfirmationMode] =
		useState<boolean>(false);
	const [isToolExecuting, setIsToolExecuting] = useState<boolean>(false);
	const [isBashExecuting, setIsBashExecuting] = useState<boolean>(false);
	const [currentBashCommand, setCurrentBashCommand] = useState<string>('');

	// Development mode state
	const [developmentMode, setDevelopmentMode] =
		useState<DevelopmentMode>('normal');

	// Incognito mode state
	const [isIncognitoMode, setIsIncognitoMode] = useState<boolean>(false);

	// Tool confirmation state
	const [pendingToolCalls, setPendingToolCalls] = useState<ToolCall[]>([]);
	const [currentToolIndex, setCurrentToolIndex] = useState<number>(0);
	const [completedToolResults, setCompletedToolResults] = useState<
		ToolResult[]
	>([]);
	const [currentConversationContext, setCurrentConversationContext] =
		useState<ConversationContext | null>(null);

	// Chat queue for components
	const [chatComponents, setChatComponents] = useState<React.ReactNode[]>([]);
	const [componentKeyCounter, setComponentKeyCounter] = useState(0);

	// Helper function to add components to the chat queue with stable keys
	const addToChatQueue = useCallback(
		(component: React.ReactNode) => {
			const newCounter = componentKeyCounter + 1;
			setComponentKeyCounter(newCounter);

			let componentWithKey = component;
			if (React.isValidElement(component) && !component.key) {
				componentWithKey = React.cloneElement(component, {
					key: `chat-component-${newCounter}`,
				});
			}

			setChatComponents(prevComponents => [
				...prevComponents,
				componentWithKey,
			]);
		},
		[componentKeyCounter],
	);

	// Create tokenizer based on current provider and model
	const tokenizer = useMemo<Tokenizer>(() => {
		if (currentProvider && currentModel) {
			return createTokenizer(currentProvider, currentModel);
		}

		// Fallback to simple char/4 heuristic if provider/model not set
		return createTokenizer('', '');
	}, [currentProvider, currentModel]);

	// Cleanup tokenizer resources when it changes
	useEffect(() => {
		return () => {
			if (tokenizer.free) {
				tokenizer.free();
			}
		};
	}, [tokenizer]);

	// Helper function for token calculation with caching
	const getMessageTokens = useCallback(
		(message: Message) => {
			const cacheKey = (message.content || '') + message.role + currentModel;

			const cachedTokens = messageTokenCache.get(cacheKey);
			if (cachedTokens !== undefined) {
				return cachedTokens;
			}

			const tokens = tokenizer.countTokens(message);
			// Defer cache update to avoid "Cannot update a component while rendering" error
			// This can happen when components call getMessageTokens during their render
			queueMicrotask(() => {
				setMessageTokenCache(prev => new Map(prev).set(cacheKey, tokens));
			});
			return tokens;
		},
		[messageTokenCache, tokenizer, currentModel],
	);

	// Message updater - no limits, display all messages
	const updateMessages = useCallback((newMessages: Message[]) => {
		setMessages(newMessages);
		setDisplayMessages(newMessages);
	}, []);

	// Reset tool confirmation state
	const resetToolConfirmationState = () => {
		setIsToolConfirmationMode(false);
		setIsToolExecuting(false);
		setPendingToolCalls([]);
		setCurrentToolIndex(0);
		setCompletedToolResults([]);
		setCurrentConversationContext(null);
	};

	// Clear chat and force re-render by toggling startChat
	const clearChat = useCallback(() => {
		setChatComponents([]);
		setStartChat(false);
		// Use queueMicrotask to set it back to true after React processes the unmount
		setTimeout(() => setStartChat(true), 100);
	}, []);

	return {
		// State
		client,
		messages,
		displayMessages,
		messageTokenCache,
		currentModel,
		currentProvider,
		currentTheme,
		toolManager,
		startChat,
		mcpInitialized,
		updateInfo,
		userProfile,
		integrations,
		mcpStatus,
		isThinking,
		isCancelling,
		abortController,
		isModelSelectionMode,
		isProviderSelectionMode,
		isThemeSelectionMode,
		isNameSelectionMode,
		isRecommendationsMode,
		isConfigWizardMode,
		isToolConfirmationMode,
		isToolExecuting,
		isBashExecuting,
		currentBashCommand,
		developmentMode,
		isIncognitoMode,
		pendingToolCalls,
		currentToolIndex,
		completedToolResults,
		currentConversationContext,
		chatComponents,
		componentKeyCounter,
		tokenizer,

		// Setters
		setClient,
		setMessages,
		setDisplayMessages,
		setMessageTokenCache,
		setCurrentModel,
		setCurrentProvider,
		setCurrentTheme,
		setToolManager,
		setStartChat,
		setMcpInitialized,
		setUpdateInfo,
		setUserProfile,
		setIntegrations,
		setMcpStatus,
		setIsThinking,
		setIsCancelling,
		setAbortController,
		setIsModelSelectionMode,
		setIsProviderSelectionMode,
		setIsThemeSelectionMode,
		setIsNameSelectionMode,
		setIsRecommendationsMode,
		setIsConfigWizardMode,
		setIsToolConfirmationMode,
		setIsToolExecuting,
		setIsBashExecuting,
		setCurrentBashCommand,
		setDevelopmentMode,
		setIsIncognitoMode,
		setPendingToolCalls,
		setCurrentToolIndex,
		setCompletedToolResults,
		setCurrentConversationContext,
		setChatComponents,
		setComponentKeyCounter,

		// Utilities
		addToChatQueue,
		getMessageTokens,
		updateMessages,
		resetToolConfirmationState,
		clearChat,
	};
}
