import {useState, useEffect} from 'react';
import {Box, Text, useInput, useFocus} from 'ink';
import Spinner from 'ink-spinner';
import {writeFileSync, mkdirSync, existsSync, readFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {spawnSync} from 'node:child_process';
import type {ProviderConfig} from '../types/config';
import type {McpServerConfig} from './templates/mcp-templates';
import {AuthStep, type CoreAuthConfig} from './steps/auth-step';
import {McpStep} from './steps/mcp-step';
import {SummaryStep} from './steps/summary-step';
import {buildConfigObject} from './validation';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {colors} from '@/config/index';
import {getConfigPath} from '@/config/paths';
import {useResponsiveTerminal} from '@/hooks/useTerminalWidth';
import {ProviderStep} from './steps/provider-step';
import {join} from 'node:path';

interface ConfigWizardProps {
	projectDir: string;
	onComplete: (configPath: string) => void;
	onCancel?: () => void;
}

type WizardStep =
	| 'auth'
	| 'providers'
	| 'mcp'
	| 'summary'
	| 'editing'
	| 'saving'
	| 'complete';

export function ConfigWizard({onComplete, onCancel}: ConfigWizardProps) {
	// Always use global config location with config.json
	const configPath = join(getConfigPath(), 'config.json');
	const [step, setStep] = useState<WizardStep>('auth');
	const [auth, setAuth] = useState<CoreAuthConfig | null>(null);
	const [providers, setProviders] = useState<ProviderConfig[]>([]);
	const [mcpServers, setMcpServers] = useState<Record<string, McpServerConfig>>(
		{},
	);
	const [error, setError] = useState<string | null>(null);
	const {boxWidth, isNarrow} = useResponsiveTerminal();

	// Capture focus to ensure keyboard handling works properly
	useFocus({autoFocus: true, id: 'config-wizard'});

	// Load existing config if editing
	useEffect(() => {
		// Use a microtask to defer state updates
		void Promise.resolve().then(() => {
			try {
				if (existsSync(configPath)) {
					const configContent = readFileSync(configPath, 'utf-8');
					const config = JSON.parse(configContent) as {
						core?: {
							auth?: CoreAuthConfig;
							providers?: ProviderConfig[];
							mcpServers?: Array<McpServerConfig>;
						};
					};

					const newAuth = config.core?.auth || null;
					const newProviders = config.core?.providers || [];

					// Convert mcpServers array to Record<string, McpServerConfig>
					const newMcpServers: Record<string, McpServerConfig> = {};
					if (config.core?.mcpServers) {
						for (const server of config.core.mcpServers) {
							newMcpServers[server.name] = server;
						}
					}

					setAuth(newAuth);
					setProviders(newProviders);
					setMcpServers(newMcpServers);
				}
			} catch (err) {
				console.error('Failed to load existing config:', err);
			}
		});
	}, [configPath]);

	const handleAuthComplete = (authConfig: CoreAuthConfig) => {
		setAuth(authConfig);
		setStep('providers');
	};

	const handleProvidersComplete = (newProviders: ProviderConfig[]) => {
		setProviders(newProviders);
		setStep('mcp');
	};

	const handleMcpComplete = (
		newMcpServers: Record<string, McpServerConfig>,
	) => {
		setMcpServers(newMcpServers);
		setStep('summary');
	};

	const handleSave = () => {
		setStep('saving');
		setError(null);

		try {
			// Build config object with auth (Core MCP will be handled internally)
			const config = buildConfigObject(providers, mcpServers, auth);

			// Ensure directory exists
			const dir = dirname(configPath);
			if (!existsSync(dir)) {
				mkdirSync(dir, {recursive: true});
			}

			// Write config file
			writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

			setStep('complete');
			// Don't auto-complete - wait for user to press Enter
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Failed to save configuration',
			);
			setStep('summary');
		}
	};

	const handleAddMcpServers = () => {
		setStep('mcp');
	};

	const handleAddProviders = () => {
		setStep('providers');
	};

	const handleCancel = () => {
		if (onCancel) {
			onCancel();
		}
	};

	const openInEditor = () => {
		try {
			// Save current progress to file (Core MCP will be handled internally)
			const config = buildConfigObject(providers, mcpServers, auth);

			// Ensure directory exists
			const dir = dirname(configPath);
			if (!existsSync(dir)) {
				mkdirSync(dir, {recursive: true});
			}

			// Write config file
			writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');

			// Detect editor (respect $EDITOR or $VISUAL environment variables)
			// Fall back to nano on Unix/Mac (much friendlier than vi!)
			// On Windows, use notepad
			const editor =
				process.env.EDITOR ||
				process.env.VISUAL ||
				(process.platform === 'win32' ? 'notepad' : 'nano');

			// Show cursor and restore terminal for editor
			process.stdout.write('\x1B[?25h'); // Show cursor
			process.stdin.setRawMode?.(false); // Disable raw mode

			// Open editor and wait for it to close
			const result = spawnSync(editor, [configPath], {
				stdio: 'inherit', // Give editor full control of terminal
			});

			// Restore terminal state after editor closes
			process.stdin.setRawMode?.(true); // Re-enable raw mode
			process.stdout.write('\x1B[?25l'); // Hide cursor (Ink will manage it)

			if (result.status === 0) {
				// Reload the edited config
				try {
					const editedContent = readFileSync(configPath, 'utf-8');
					const editedConfig = JSON.parse(editedContent) as {
						core?: {
							auth?: CoreAuthConfig;
							providers?: ProviderConfig[];
							mcpServers?: Array<McpServerConfig>;
						};
					};

					// Update state with edited values
					if (editedConfig.core) {
						setAuth(editedConfig.core.auth || null);
						setProviders(editedConfig.core.providers || []);

						// Convert mcpServers array to Record<string, McpServerConfig>
						const loadedMcpServers: Record<string, McpServerConfig> = {};
						if (editedConfig.core.mcpServers) {
							for (const server of editedConfig.core.mcpServers) {
								loadedMcpServers[server.name] = server;
							}
						}
						setMcpServers(loadedMcpServers);
					}

					// Return to summary to review changes
					setStep('summary');
					setError(null);
				} catch (parseErr) {
					setError(
						parseErr instanceof Error
							? `Invalid JSON: ${parseErr.message}`
							: 'Failed to parse edited configuration',
					);
					setStep('summary');
				}
			} else {
				setError('Editor exited with an error. Changes may not be saved.');
				setStep('summary');
			}
		} catch (err) {
			// Restore terminal state on error
			process.stdin.setRawMode?.(true);
			process.stdout.write('\x1B[?25l');

			setError(
				err instanceof Error
					? `Failed to open editor: ${err.message}`
					: 'Failed to open editor',
			);
			setStep('summary');
		}
	};

	// Handle global keyboard shortcuts
	useInput((input, key) => {
		// In complete step, wait for Enter to finish
		if (step === 'complete' && key.return) {
			onComplete(configPath);
			return;
		}

		// Escape - cancel/exit wizard completely
		if (key.escape) {
			if (onCancel) {
				onCancel();
			}
			return;
		}

		// Ctrl+E to open editor (available after location is chosen)
		if (
			key.ctrl &&
			input === 'e' &&
			configPath &&
			(step === 'auth' ||
				step === 'providers' ||
				step === 'mcp' ||
				step === 'summary')
		) {
			openInEditor();
		}
	});

	const renderStep = () => {
		switch (step) {
			case 'auth': {
				return (
					<AuthStep
						existingAuth={auth || undefined}
						onComplete={handleAuthComplete}
					/>
				);
			}
			case 'providers': {
				return (
					<ProviderStep
						existingProviders={providers}
						onComplete={handleProvidersComplete}
						onBack={() => setStep('auth')}
					/>
				);
			}
			case 'mcp': {
				return (
					<McpStep
						existingServers={mcpServers}
						onComplete={handleMcpComplete}
						onBack={() => setStep('providers')}
					/>
				);
			}
			case 'summary': {
				return (
					<SummaryStep
						configPath={configPath}
						providers={providers}
						mcpServers={mcpServers}
						onSave={handleSave}
						onAddProviders={handleAddProviders}
						onAddMcpServers={handleAddMcpServers}
						onCancel={handleCancel}
						onBack={() => setStep('mcp')}
						auth={auth || undefined}
					/>
				);
			}
			case 'editing': {
				return (
					<Box flexDirection="column">
						<Box marginBottom={1}>
							<Text color={colors.primary}>Opening editor...</Text>
						</Box>
						<Box marginBottom={1}>
							<Text dimColor>Configuration saved to: {configPath}</Text>
						</Box>
						<Box>
							<Text color={colors.secondary}>
								Save and close your editor to return to the wizard.
							</Text>
						</Box>
					</Box>
				);
			}
			case 'saving': {
				return (
					<Box flexDirection="column">
						<Box>
							<Text color={colors.success}>
								<Spinner type="dots" /> Saving configuration...
							</Text>
						</Box>
					</Box>
				);
			}
			case 'complete': {
				return (
					<Box flexDirection="column">
						<Box marginBottom={1}>
							<Text color={colors.success} bold>
								✓ Configuration saved!
							</Text>
						</Box>
						<Box marginBottom={1}>
							<Text dimColor>Saved to: {configPath}</Text>
						</Box>
						<Box>
							<Text color={colors.secondary}>Press Enter to continue</Text>
						</Box>
					</Box>
				);
			}
			default: {
				return null;
			}
		}
	};

	return (
		<TitledBox
			key={colors.muted}
			borderStyle="round"
			titles={[`Configuration Wizard`]}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.muted}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			{error && (
				<Box marginBottom={1}>
					<Text color={colors.error}>Error: {error}</Text>
				</Box>
			)}

			{renderStep()}

			{(step === 'auth' ||
				step === 'providers' ||
				step === 'mcp' ||
				step === 'summary') &&
				(isNarrow ? (
					<Box marginTop={1} flexDirection="column">
						<Text color={colors.white} dimColor>
							Esc: Exit wizard
						</Text>
						{step !== 'auth' && (
							<Text color={colors.white} dimColor>
								Shift+Tab: Go back
							</Text>
						)}
						{configPath && (
							<Text color={colors.white} dimColor>
								Ctrl+E: Edit manually
							</Text>
						)}
					</Box>
				) : (
					<Box marginTop={1}>
						<Text color={colors.white} dimColor>
							Esc: Exit wizard
							{step !== 'auth' && ' | Shift+Tab: Go back'}
							{configPath && ' | Ctrl+E: Edit manually'}
						</Text>
					</Box>
				))}
		</TitledBox>
	);
}
