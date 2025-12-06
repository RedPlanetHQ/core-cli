import {Box, Text} from 'ink';
import WelcomeMessage from '@/components/welcome-message';
import React, {useEffect} from 'react';
import {getThemeColors} from '@/config/themes';
import {ThemeContext} from '@/hooks/useTheme';
import {setGlobalMessageQueue} from '@/utils/message-queue';
import {useAppInitialization} from '@/hooks/useAppInitialization';
import {registerStatusBarRefresh} from '@/utils/status-bar-events';

// Import extracted hooks and utilities
import {useAppState} from '@/hooks/useAppState';

// Provide shared UI state to components
import {UIStateProvider} from '@/hooks/useUIState';
import UserInput from '@/components/user-input';
import Spinner from 'ink-spinner';
import {useModeHandlers} from './hooks/useModeHandlers';
import Status from '@/components/status';
import {
	createClearMessagesHandler,
	handleMessageSubmission,
} from './app/utils/appUtils';
import {useChatHandler} from './hooks/useChatHandler';
import ChatQueue from './components/chat-queue';
import CancellingIndicator from './components/cancelling-indicator';
import ThinkingIndicator from './components/thinking-indicator';
import ThemeSelector from './components/theme-selector';
import {ConfigWizard} from './wizard/config-wizard';
import ToolConfirmation from './components/tool-confirmation';
import ToolExecutionIndicator from './components/tool-execution-indicator';
import BashExecutionIndicator from './components/bash-execution-indicator';
import {useToolHandler} from './hooks/useToolHandler';
import ModelSelector from './components/model-selector';
import ProviderSelector from './components/provider-selector';
import CodingAgentSelector from './components/coding-agent-selector';
import NameSelector from './components/name-selector';
import {getAssistantName} from './config/preferences';
import {appConfig} from './config/index';

export default function App() {
	// Use extracted hooks
	const appState = useAppState();

	// Setup initialization
	const appInitialization = useAppInitialization({
		setClient: appState.setClient,
		setCurrentModel: appState.setCurrentModel,
		setCurrentProvider: appState.setCurrentProvider,
		setToolManager: appState.setToolManager,
		setStartChat: appState.setStartChat,
		setMcpInitialized: appState.setMcpInitialized,
		setUpdateInfo: appState.setUpdateInfo,
		addToChatQueue: appState.addToChatQueue,
		componentKeyCounter: appState.componentKeyCounter,
		setIsConfigWizardMode: appState.setIsConfigWizardMode,
		setUserProfile: appState.setUserProfile,
		setIntegrations: appState.setIntegrations,
		setMcpStatus: appState.setMcpStatus,
	});

	// Create theme context value
	const themeContextValue = {
		currentTheme: appState.currentTheme,
		colors: getThemeColors(appState.currentTheme),
		setCurrentTheme: appState.setCurrentTheme,
	};

	// Initialize global message queue on component mount
	React.useEffect(() => {
		setGlobalMessageQueue(appState.addToChatQueue);
	}, [appState.addToChatQueue]);

	// Register status bar refresh callback
	useEffect(() => {
		registerStatusBarRefresh(appState.triggerStatusBarRefresh);
	}, [appState.triggerStatusBarRefresh]);

	// Flush queued components to static after they render
	React.useEffect(() => {
		if (appState.queuedChatComponents.length > 0) {
			// Use setTimeout to ensure components have rendered first
			const timer = setTimeout(() => {
				appState.flushQueuedToStatic();
			}, 0);
			return () => clearTimeout(timer);
		}
	}, [
		appState.queuedChatComponents.length,
		appState.flushQueuedToStatic,
		appState,
	]);

	// Setup mode handlers
	const modeHandlers = useModeHandlers({
		client: appState.client,
		currentModel: appState.currentModel,
		currentProvider: appState.currentProvider,
		currentTheme: appState.currentTheme,
		setClient: appState.setClient,
		setCurrentModel: appState.setCurrentModel,
		setCurrentProvider: appState.setCurrentProvider,
		setCurrentTheme: appState.setCurrentTheme,
		setMessages: appState.updateMessages,
		setIsModelSelectionMode: appState.setIsModelSelectionMode,
		setIsProviderSelectionMode: appState.setIsProviderSelectionMode,
		setIsThemeSelectionMode: appState.setIsThemeSelectionMode,
		setIsNameSelectionMode: appState.setIsNameSelectionMode,
		setIsCodingAgentSelectionMode: appState.setIsCodingAgentSelectionMode,
		setIsRecommendationsMode: appState.setIsRecommendationsMode,
		setIsConfigWizardMode: appState.setIsConfigWizardMode,
		addToChatQueue: appState.addToChatQueue,
		componentKeyCounter: appState.componentKeyCounter,
		reinitializeMCPServers: appInitialization.reinitializeMCPServers,
	});

	const chatHandler = useChatHandler({
		client: appState.client,
		toolManager: appState.toolManager,
		messages: appState.messages,
		setMessages: appState.updateMessages,
		currentModel: appState.currentModel,
		setIsThinking: appState.setIsThinking,
		setIsCancelling: appState.setIsCancelling,
		addToChatQueue: appState.addToChatQueue,
		componentKeyCounter: appState.componentKeyCounter,
		abortController: appState.abortController,
		setAbortController: appState.setAbortController,
		developmentMode: appState.developmentMode,
		userProfile: appState.userProfile,
		integrations: appState.integrations,
		isIncognitoMode: appState.isIncognitoMode,
		onStartToolConfirmationFlow: (
			toolCalls,
			updatedMessages,
			assistantMsg,
			systemMessage,
		) => {
			appState.setPendingToolCalls(toolCalls);
			appState.setCurrentToolIndex(0);
			appState.setCompletedToolResults([]);
			appState.setCurrentConversationContext({
				updatedMessages,
				assistantMsg,
				systemMessage,
			});
			appState.setIsToolConfirmationMode(true);
		},
	});

	// Setup tool handler
	const toolHandler = useToolHandler({
		pendingToolCalls: appState.pendingToolCalls,
		currentToolIndex: appState.currentToolIndex,
		completedToolResults: appState.completedToolResults,
		currentConversationContext: appState.currentConversationContext,
		setPendingToolCalls: appState.setPendingToolCalls,
		setCurrentToolIndex: appState.setCurrentToolIndex,
		setCompletedToolResults: appState.setCompletedToolResults,
		setCurrentConversationContext: appState.setCurrentConversationContext,
		setIsToolConfirmationMode: appState.setIsToolConfirmationMode,
		setIsToolExecuting: appState.setIsToolExecuting,
		setMessages: appState.updateMessages,
		addToChatQueue: appState.addToChatQueue,
		componentKeyCounter: appState.componentKeyCounter,
		resetToolConfirmationState: appState.resetToolConfirmationState,
		onProcessAssistantResponse: chatHandler.processAssistantResponse,
		client: appState.client,
		currentProvider: appState.currentProvider,
		setDevelopmentMode: appState.setDevelopmentMode,
	});

	// Memoize handlers to prevent unnecessary re-renders
	const clearMessages = React.useMemo(
		() =>
			createClearMessagesHandler(
				appState.updateMessages,
				appState.client,
				appState.clearChat,
			),
		[appState.updateMessages, appState.client, appState.clearChat],
	);

	const handleShowStatus = React.useCallback(() => {
		appState.addToChatQueue(
			<Status
				key={`status-${appState.componentKeyCounter}`}
				provider={appState.currentProvider}
				model={appState.currentModel}
				theme={appState.currentTheme}
				updateInfo={appState.updateInfo}
			/>,
		);
	}, [appState]);

	const handleToggleIncognitoMode = React.useCallback(() => {
		appState.setIsIncognitoMode(!appState.isIncognitoMode);
		appState.addToChatQueue(
			<Text key={`incognito-${appState.componentKeyCounter}`} color="gray">
				Incognito mode {!appState.isIncognitoMode ? 'enabled' : 'disabled'}.
				Episodes will {!appState.isIncognitoMode ? 'not ' : ''}be saved.
			</Text>,
		);
	}, [appState]);

	const handleMessageSubmit = React.useCallback(
		async (message: string) => {
			await handleMessageSubmission(message, {
				onClearMessages: clearMessages,
				onEnterModelSelectionMode: modeHandlers.enterModelSelectionMode,
				onEnterProviderSelectionMode: modeHandlers.enterProviderSelectionMode,
				onEnterThemeSelectionMode: modeHandlers.enterThemeSelectionMode,
				onEnterNameSelectionMode: modeHandlers.enterNameSelectionMode,
				onEnterCodingAgentSelectionMode:
					modeHandlers.enterCodingAgentSelectionMode,
				onEnterRecommendationsMode: modeHandlers.enterRecommendationsMode,
				onEnterConfigWizardMode: modeHandlers.enterConfigWizardMode,
				onShowStatus: handleShowStatus,
				onToggleIncognitoMode: handleToggleIncognitoMode,
				onHandleChatMessage: chatHandler.handleChatMessage,
				onAddToChatQueue: appState.addToChatQueue,
				componentKeyCounter: appState.componentKeyCounter,
				setMessages: appState.updateMessages,
				messages: appState.messages,
				setIsBashExecuting: appState.setIsBashExecuting,
				setCurrentBashCommand: appState.setCurrentBashCommand,
				provider: appState.currentProvider,
				model: appState.currentModel,
				theme: appState.currentTheme,
				updateInfo: appState.updateInfo,
				getMessageTokens: appState.getMessageTokens,
				isIncognitoMode: appState.isIncognitoMode,
			});
		},
		[
			clearMessages,
			modeHandlers.enterModelSelectionMode,
			modeHandlers.enterProviderSelectionMode,
			modeHandlers.enterThemeSelectionMode,
			modeHandlers.enterRecommendationsMode,
			modeHandlers.enterConfigWizardMode,
			modeHandlers.enterNameSelectionMode,
			modeHandlers.enterCodingAgentSelectionMode,
			handleShowStatus,
			handleToggleIncognitoMode,
			chatHandler.handleChatMessage,
			appState.addToChatQueue,
			appState.componentKeyCounter,
			appState.updateMessages,
			appState.messages,
			appState.setIsBashExecuting,
			appState.setCurrentBashCommand,
			appState.currentProvider,
			appState.currentModel,
			appState.currentTheme,
			appState.updateInfo,
			appState.getMessageTokens,
			appState.isIncognitoMode,
		],
	);

	const handleCancel = React.useCallback(() => {
		if (appState.abortController) {
			appState.setIsCancelling(true);
			appState.abortController.abort();
		}
	}, [appState]);

	const handleToggleDevelopmentMode = React.useCallback(() => {
		appState.setDevelopmentMode(currentMode => {
			const modes: Array<'normal' | 'auto-accept'> = ['normal', 'auto-accept'];
			const currentIndex = modes.indexOf(currentMode);
			const nextIndex = (currentIndex + 1) % modes.length;
			return modes[nextIndex];
		});
	}, [appState]);

	// Memoize static components to prevent unnecessary re-renders
	const staticComponents = React.useMemo(
		() => [<WelcomeMessage key="welcome" />],
		[],
	);

	return (
		<ThemeContext.Provider value={themeContextValue}>
			<UIStateProvider>
				<Box flexDirection="column" padding={1} width="100%">
					{/* Use natural flexGrow layout - Static components prevent re-renders */}
					<Box flexGrow={1} flexDirection="column" minHeight={0}>
						{appState.startChat && (
							<ChatQueue
								staticComponents={[
									...staticComponents,
									...appState.staticChatComponents,
								]}
								queuedComponents={appState.queuedChatComponents}
							/>
						)}
					</Box>
					{appState.startChat && (
						<Box flexDirection="column" marginLeft={-1}>
							{appState.isCancelling ? (
								<CancellingIndicator />
							) : appState.isThinking && !chatHandler.isStreaming ? (
								<ThinkingIndicator />
							) : null}

							{chatHandler.isStreaming && chatHandler.streamingContent && (
								<Box flexDirection="column" marginBottom={1}>
									<Box marginBottom={1}>
										<Text color={themeContextValue.colors.primary} bold>
											{getAssistantName()}:
										</Text>
									</Box>
									<Text>{chatHandler.streamingContent}</Text>
								</Box>
							)}

							{appState.isModelSelectionMode ? (
								<ModelSelector
									client={appState.client}
									currentModel={appState.currentModel}
									onModelSelect={model =>
										void modeHandlers.handleModelSelect(model)
									}
									onCancel={modeHandlers.handleModelSelectionCancel}
								/>
							) : appState.isProviderSelectionMode ? (
								<ProviderSelector
									currentProvider={appState.currentProvider}
									onProviderSelect={provider =>
										void modeHandlers.handleProviderSelect(provider)
									}
									onCancel={modeHandlers.handleProviderSelectionCancel}
								/>
							) : appState.isCodingAgentSelectionMode ? (
								<CodingAgentSelector
									currentAgent={appConfig.defaultCodingAgent}
									onAgentSelect={modeHandlers.handleCodingAgentSelect}
									onCancel={modeHandlers.handleCodingAgentSelectionCancel}
								/>
							) : appState.isThemeSelectionMode ? (
								<ThemeSelector
									onThemeSelect={modeHandlers.handleThemeSelect}
									onCancel={modeHandlers.handleThemeSelectionCancel}
								/>
							) : appState.isNameSelectionMode ? (
								<NameSelector
									onNameSelect={modeHandlers.handleNameSelect}
									onCancel={modeHandlers.handleNameSelectionCancel}
								/>
							) : appState.isConfigWizardMode ? (
								<ConfigWizard
									projectDir={process.cwd()}
									onComplete={configPath =>
										void modeHandlers.handleConfigWizardComplete(configPath)
									}
									onCancel={modeHandlers.handleConfigWizardCancel}
								/>
							) : appState.isToolConfirmationMode &&
							  appState.pendingToolCalls[appState.currentToolIndex] ? (
								<ToolConfirmation
									toolCall={
										appState.pendingToolCalls[appState.currentToolIndex]
									}
									onConfirm={toolHandler.handleToolConfirmation}
									onCancel={toolHandler.handleToolConfirmationCancel}
								/>
							) : appState.isToolExecuting &&
							  appState.pendingToolCalls[appState.currentToolIndex] ? (
								<ToolExecutionIndicator
									toolName={
										appState.pendingToolCalls[appState.currentToolIndex]
											.function.name
									}
									currentIndex={appState.currentToolIndex}
									totalTools={appState.pendingToolCalls.length}
								/>
							) : appState.isBashExecuting ? (
								<BashExecutionIndicator command={appState.currentBashCommand} />
							) : appState.mcpInitialized && appState.client ? (
								<UserInput
									customCommands={[]}
									onSubmit={msg => void handleMessageSubmit(msg)}
									disabled={
										appState.isThinking ||
										appState.isToolExecuting ||
										appState.isBashExecuting
									}
									onCancel={handleCancel}
									onToggleMode={handleToggleDevelopmentMode}
									developmentMode={appState.developmentMode}
									mcpStatus={appState.mcpStatus}
									isIncognitoMode={appState.isIncognitoMode}
									statusBarRefreshTrigger={appState.statusBarRefreshTrigger}
									onStatusBarRefresh={appState.triggerStatusBarRefresh}
								/>
							) : appState.mcpInitialized && !appState.client ? (
								<></>
							) : (
								<Text color={themeContextValue.colors.white}>
									<Spinner type="dots2" /> Loading...
								</Text>
							)}
						</Box>
					)}
				</Box>
			</UIStateProvider>
		</ThemeContext.Provider>
	);
}
