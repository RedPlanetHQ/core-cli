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
import ThemeSelector from './components/theme-selector';
import {ConfigWizard} from './wizard/config-wizard';
import ToolConfirmation from './components/tool-confirmation';
import BashExecutionIndicator from './components/bash-execution-indicator';
import ProgressIndicator from './components/progress-indicator';
import ModelSelector from './components/model-selector';
import ProviderSelector from './components/provider-selector';
import CodingAgentSelector from './components/coding-agent-selector';
import NameSelector from './components/name-selector';
import {getAssistantName} from './config/preferences';
import {appConfig} from './config/index';
import {setCurrentMode as setCurrentModeContext} from '@/context/mode-context';
import {approvalRegistry} from './utils/approval-registry';

export function shouldRenderWelcome(nonInteractiveMode?: boolean) {
	return !nonInteractiveMode;
}

/**
 * Helper function to determine if non-interactive mode processing is complete
 */
export function isNonInteractiveModeComplete(
	appState: {
		isToolExecuting: boolean;
		isBashExecuting: boolean;
		isToolConfirmationMode: boolean;
		isConversationComplete: boolean;
		messages: Array<{role: string; content: string}>;
	},
	startTime: number,
	maxExecutionTimeMs: number,
): {
	shouldExit: boolean;
	reason: 'complete' | 'timeout' | 'error' | 'tool-approval' | null;
} {
	const isComplete =
		!appState.isToolExecuting &&
		!appState.isBashExecuting &&
		!appState.isToolConfirmationMode;
	const _hasMessages = appState.messages.length > 0;
	const hasTimedOut = Date.now() - startTime > maxExecutionTimeMs;

	// Check for error messages in the messages array
	const hasErrorMessages = appState.messages.some(
		(message: {role: string; content: string}) =>
			message.role === 'error' ||
			(typeof message.content === 'string' &&
				message.content.toLowerCase().includes('error')),
	);

	// Check for tool approval required messages
	const hasToolApprovalRequired = appState.messages.some(
		(message: {role: string; content: string}) =>
			typeof message.content === 'string' &&
			message.content.includes('Tool approval required'),
	);

	if (hasTimedOut) {
		return {shouldExit: true, reason: 'timeout'};
	}

	if (hasToolApprovalRequired) {
		return {shouldExit: true, reason: 'tool-approval'};
	}

	if (hasErrorMessages) {
		return {shouldExit: true, reason: 'error'};
	}

	// Exit when conversation is complete and either:
	// - We have messages in history (for chat/bash commands), OR
	// - Conversation is marked complete (for display-only commands like /mcp)
	if (isComplete && appState.isConversationComplete) {
		return {shouldExit: true, reason: 'complete'};
	}

	return {shouldExit: false, reason: null};
}

export default function App() {
	// Use extracted hooks
	const appState = useAppState();

	// Sync global mode context whenever development mode changes
	React.useEffect(() => {
		setCurrentModeContext(appState.developmentMode);
	}, [appState.developmentMode]);

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
		setIsCancelling: appState.setIsCancelling,
		addToChatQueue: appState.addToChatQueue,
		componentKeyCounter: appState.componentKeyCounter,
		abortController: appState.abortController,
		setAbortController: appState.setAbortController,
		developmentMode: appState.developmentMode,
		userProfile: appState.userProfile,
		integrations: appState.integrations,
		isIncognitoMode: appState.isIncognitoMode,
		setIsToolExecuting: appState.setIsToolExecuting,
		setCurrentDirectTool: appState.setCurrentDirectTool,
		onConversationComplete: () => {
			// Signal that the conversation has completed
			appState.setIsConversationComplete(true);
		},
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
			const nextMode = modes[nextIndex];

			// Sync global mode context for tool needsApproval logic
			setCurrentModeContext(nextMode);

			return nextMode;
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
							{appState.isCancelling && <CancellingIndicator />}

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
							  appState.pendingApproval ? (
								<ToolConfirmation
									toolCall={appState.pendingApproval.toolCall}
									metadata={appState.pendingApproval.metadata}
									onConfirm={(approved: boolean) => {
										if (appState.pendingApproval) {
											approvalRegistry.resolve(
												appState.pendingApproval.toolCall.id,
												approved,
											);
											appState.setIsToolConfirmationMode(false);
										}
									}}
									onCancel={() => {
										if (appState.pendingApproval) {
											approvalRegistry.resolve(
												appState.pendingApproval.toolCall.id,
												false,
											);
											appState.setIsToolConfirmationMode(false);
										}
									}}
								/>
							) : appState.isToolExecuting ? (
								<ProgressIndicator
									toolName={
										(
											appState.pendingToolCalls[appState.currentToolIndex] ||
											appState.currentDirectTool
										)?.function.name
									}
									toolArgs={
										(
											appState.pendingToolCalls[appState.currentToolIndex] ||
											appState.currentDirectTool
										)?.function.arguments
									}
									toolManager={appState.toolManager}
									toolCallId={
										(
											appState.pendingToolCalls[appState.currentToolIndex] ||
											appState.currentDirectTool
										)?.id
									}
								/>
							) : appState.isBashExecuting ? (
								<BashExecutionIndicator command={appState.currentBashCommand} />
							) : appState.mcpInitialized && appState.client ? (
								<UserInput
									customCommands={[]}
									onSubmit={msg => void handleMessageSubmit(msg)}
									disabled={
										chatHandler.isStreaming ||
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
