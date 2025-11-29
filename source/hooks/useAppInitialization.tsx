/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import React, {useEffect} from 'react';
import {LLMClient} from '@/types/core';
import {ToolManager} from '@/tools/tool-manager';
import {createLLMClient, ConfigurationError} from '@/client-factory';
import {
	getLastUsedModel,
	loadPreferences,
	updateLastUsed,
} from '@/config/preferences';
import type {MCPInitResult, UserPreferences} from '@/types/index';
import {setToolManagerGetter, setToolRegistryGetter} from '@/message-handler';
import {commandRegistry} from '@/commands';
import {appConfig, reloadAppConfig} from '@/config/index';

import {
	clearCommand,
	exitCommand,
	helpCommand,
	modelCommand,
	providerCommand,
	setupConfigCommand,
	mcpCommand,
	usageCommand,
	setNameCommand,
	updateCommand,
	tasksCommand,
	incognitoCommand,
} from '@/commands/index';
import InfoMessage from '@/components/info-message';
import ErrorMessage from '@/components/error-message';
import {checkForUpdates} from '@/utils/update-checker';
import type {UpdateInfo} from '@/types/utils';
import {initializeSession} from '@/usage/tracker';
import {syncTasksToCore} from '@/utils/tasks';
import {updateLastTaskSync} from '@/config/index';

interface UseAppInitializationProps {
	setClient: (client: LLMClient | null) => void;
	setCurrentModel: (model: string) => void;
	setCurrentProvider: (provider: string) => void;
	setToolManager: (manager: ToolManager | null) => void;
	setStartChat: (start: boolean) => void;
	setMcpInitialized: (initialized: boolean) => void;
	setUpdateInfo: (info: UpdateInfo | null) => void;
	addToChatQueue: (component: React.ReactNode) => void;
	componentKeyCounter: number;
	setIsConfigWizardMode: (mode: boolean) => void;
	setUserProfile: (profile: string | undefined) => void;
	setIntegrations: (integrations: string | undefined) => void;
	setMcpStatus: (status: string | null) => void;
}

export function useAppInitialization({
	setClient,
	setCurrentModel,
	setCurrentProvider,
	setToolManager,
	setStartChat,
	setMcpInitialized,
	setUpdateInfo,
	addToChatQueue,
	componentKeyCounter,
	setIsConfigWizardMode,
	setUserProfile,
	setIntegrations,
	setMcpStatus,
}: UseAppInitializationProps) {
	// Initialize LLM client and model
	const initializeClient = async (preferredProvider?: string) => {
		const {client, actualProvider} = await createLLMClient(preferredProvider);
		setClient(client);
		setCurrentProvider(actualProvider);

		// Try to use the last used model for this provider
		const lastUsedModel = getLastUsedModel(actualProvider);

		let finalModel: string;
		if (lastUsedModel) {
			const availableModels = await client.getAvailableModels();
			if (availableModels.includes(lastUsedModel)) {
				client.setModel(lastUsedModel);
				finalModel = lastUsedModel;
			} else {
				finalModel = client.getCurrentModel();
			}
		} else {
			finalModel = client.getCurrentModel();
		}

		setCurrentModel(finalModel);

		// Save the preference - use actualProvider and the model that was actually set
		updateLastUsed(actualProvider, finalModel);

		// Initialize session tracker with the provider and model
		initializeSession(actualProvider, finalModel);
	};

	// Validate Core API key
	const validateCoreAuth = async (
		auth: {url: string; apiKey: string} | undefined,
	) => {
		if (!auth) return false;

		try {
			const response = await fetch(`${auth.url}/api/v1/me`, {
				headers: {
					Authorization: `Bearer ${auth.apiKey}`,
				},
			});
			return response.ok;
		} catch {
			return false;
		}
	};

	// Initialize MCP servers if configured
	const initializeMCPServers = async (toolManager: ToolManager) => {
		const servers = [...(appConfig.mcpServers || [])];

		// Add Core MCP server internally if auth is available
		if (appConfig.auth) {
			const isValid = await validateCoreAuth(appConfig.auth);
			if (isValid) {
				servers.push({
					name: 'core',
					transport: 'http',
					url: `${appConfig.auth.url}/api/v1/mcp?source=cli`,
					headers: {
						Authorization: `Bearer ${appConfig.auth.apiKey}`,
					},
					description: 'Core MCP server',
					enabled: true,
				});
			}
		}

		if (servers.length > 0) {
			// Set connecting status
			setMcpStatus(
				`Connecting to ${servers.length} MCP server${
					servers.length > 1 ? 's' : ''
				}...`,
			);

			// Define progress callback to show live updates
			const onProgress = (result: MCPInitResult) => {
				if (result.success) {
					setMcpStatus('');
				} else {
					setMcpStatus(
						`Failed to connect to MCP server "${result.serverName}": ${result.error}`,
					);
				}
			};

			try {
				await toolManager.initializeMCP(servers, onProgress);

				// Fetch user profile and integrations from Core API if authenticated
				if (appConfig.auth) {
					try {
						// Fetch user profile from /api/v1/me
						const meResponse = await fetch(`${appConfig.auth.url}/api/v1/me`, {
							headers: {
								Authorization: `Bearer ${appConfig.auth.apiKey}`,
							},
						});

						if (meResponse.ok) {
							// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
							const meData = (await meResponse.json()) as any;
							if (meData.persona) {
								setUserProfile(meData.persona as string);
							}
						}

						// Get the tool handler for integrations
						const integrationsHandler =
							toolManager.getToolHandler('get_integrations');

						// Call get_integrations
						if (integrationsHandler) {
							const integrationsResult = await integrationsHandler({});
							setIntegrations(integrationsResult);
						}

						// Sync current week's tasks to Core API
						await syncTasksToCore();

						// Update last sync timestamp
						const now = new Date().toISOString();
						updateLastTaskSync(now);
					} catch (error) {
						// Silent failure - don't block initialization if these calls fail
						console.warn(
							'Failed to fetch Core MCP initialization data:',
							error,
						);
					}
				}
			} catch (error) {
				setMcpStatus(`Failed to initialize MCP servers: ${String(error)}`);
			}
			// Mark MCP as initialized whether successful or not
			setMcpInitialized(true);
		} else {
			// No MCP servers configured, mark as initialized immediately
			setMcpInitialized(true);
			setMcpStatus(null);
		}
	};

	const start = async (preferences: UserPreferences): Promise<void> => {
		try {
			await initializeClient(preferences.lastProvider);
		} catch (error) {
			// Check if it's a ConfigurationError - launch wizard for any config issue
			if (error instanceof ConfigurationError) {
				addToChatQueue(
					<InfoMessage
						key={`config-error-${componentKeyCounter}`}
						message="Configuration needed. Let's set up your providers..."
						hideBox={true}
					/>,
				);
				// Trigger wizard mode after showing UI
				setTimeout(() => {
					setIsConfigWizardMode(true);
				}, 100);
			} else {
				// Regular error - show simple error message
				addToChatQueue(
					<ErrorMessage
						key={`init-error-${componentKeyCounter}`}
						message={`No providers available: ${String(error)}`}
						hideBox={true}
					/>,
				);
			}
			// Leave client as null - the UI will handle this gracefully
		}
	};

	useEffect(() => {
		const initializeApp = async () => {
			setClient(null);
			setCurrentModel('');

			const newToolManager = new ToolManager();

			setToolManager(newToolManager);

			// Load preferences - we'll pass them directly to avoid state timing issues
			const preferences = loadPreferences();

			// Set up the tool registry getter for the message handler
			setToolRegistryGetter(() => newToolManager.getToolRegistry());

			// Set up the tool manager getter for commands that need it
			setToolManagerGetter(() => newToolManager);

			commandRegistry.register([
				helpCommand,
				exitCommand,
				clearCommand,
				modelCommand,
				providerCommand,
				setupConfigCommand,
				usageCommand,
				mcpCommand,
				setNameCommand,
				updateCommand,
				tasksCommand,
				incognitoCommand,
			]);

			// Now start with the properly initialized objects (excluding MCP)
			await start(preferences);

			// Check for updates before showing UI
			try {
				const info = await checkForUpdates();
				setUpdateInfo(info);
			} catch {
				// Silent failure - don't show errors for update checks
				setUpdateInfo(null);
			}

			setStartChat(true);

			// Initialize MCP servers after UI is shown
			await initializeMCPServers(newToolManager);

			// Initialize LSP servers with auto-discovery
		};

		void initializeApp();
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return {
		initializeClient,
		initializeMCPServers,
		reinitializeMCPServers: async (toolManager: ToolManager) => {
			// Reload app config to get latest MCP servers
			reloadAppConfig();
			// Reinitialize MCP servers with new configuration
			await initializeMCPServers(toolManager);
		},
	};
}
