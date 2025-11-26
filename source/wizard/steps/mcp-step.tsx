import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import {
	MCP_TEMPLATES,
	type McpTemplate,
	type McpServerConfig,
} from '../templates/mcp-templates';
import {colors} from '@/config/index';
import {useResponsiveTerminal} from '@/hooks/useTerminalWidth';

interface McpStepProps {
	onComplete: (mcpServers: Record<string, McpServerConfig>) => void;
	onBack?: () => void;
	existingServers?: Record<string, McpServerConfig>;
}

type Mode =
	| 'template-selection'
	| 'edit-selection'
	| 'edit-or-delete'
	| 'field-input'
	| 'done';

interface TemplateOption {
	label: string;
	value: string;
}

export function McpStep({
	onComplete,
	onBack,
	existingServers = {},
}: McpStepProps) {
	const {isNarrow} = useResponsiveTerminal();
	const [servers, setServers] =
		useState<Record<string, McpServerConfig>>(existingServers);
	const [mode, setMode] = useState<Mode>('template-selection');
	const [selectedTemplate, setSelectedTemplate] = useState<McpTemplate | null>(
		null,
	);
	const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
	const [fieldAnswers, setFieldAnswers] = useState<Record<string, string>>({});
	const [currentValue, setCurrentValue] = useState('');
	const [multilineBuffer, setMultilineBuffer] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [inputKey, setInputKey] = useState(0);
	const [editingServerName, setEditingServerName] = useState<string | null>(
		null,
	);

	const serverNames = Object.keys(servers);

	const templateOptions: TemplateOption[] = [
		...(serverNames.length > 0
			? [{label: 'Edit existing MCP servers', value: 'edit'}]
			: []),
		...MCP_TEMPLATES.map(template => ({
			// Hide descriptions on narrow terminals
			label: isNarrow
				? template.name
				: `${template.name} - ${template.description}`,
			value: template.id,
		})),
		{
			label: `Done adding MCP servers`,
			value: 'done',
		},
	];

	const editOptions: TemplateOption[] = [
		...serverNames.map((name, index) => ({
			label: `${index + 1}. ${name}`,
			value: `edit-${name}`,
		})),
	];

	const handleTemplateSelect = (item: TemplateOption) => {
		if (item.value === 'done') {
			onComplete(servers);
			return;
		}

		if (item.value === 'edit') {
			setMode('edit-selection');
			return;
		}

		// Adding new server
		const template = MCP_TEMPLATES.find(t => t.id === item.value);
		if (template) {
			setEditingServerName(null); // Not editing
			setSelectedTemplate(template);
			setCurrentFieldIndex(0);
			setFieldAnswers({});
			setCurrentValue(template.fields[0]?.default || '');
			setMultilineBuffer('');
			setError(null);
			setMode('field-input');
		}
	};

	const handleEditSelect = (item: TemplateOption) => {
		// Store the server name and show edit/delete options
		if (item.value.startsWith('edit-')) {
			const serverName = item.value.replace('edit-', '');
			setEditingServerName(serverName);
			setMode('edit-or-delete');
		}
	};

	const handleEditOrDeleteChoice = (item: {value: string}) => {
		if (item.value === 'delete' && editingServerName !== null) {
			// Delete the server
			const newServers = {...servers};
			delete newServers[editingServerName];
			setServers(newServers);
			setEditingServerName(null);
			// Always go back to template selection after deleting
			setMode('template-selection');
			return;
		}

		if (item.value === 'edit' && editingServerName !== null) {
			const server = servers[editingServerName];
			if (server) {
				// Find matching template (or use custom based on command)
				const template =
					MCP_TEMPLATES.find(t => t.id === editingServerName) ||
					MCP_TEMPLATES.find(t => t.id === 'custom');

				if (template) {
					setSelectedTemplate(template);
					setCurrentFieldIndex(0);

					// Pre-populate field answers from existing server
					const answers: Record<string, string> = {};
					if (server.name) answers.name = server.name;
					if (server.command) answers.command = server.command;

					// Special handling for filesystem server - extract allowed directories
					if (template.id === 'filesystem' && server.args) {
						// Args format: ['-y', '@modelcontextprotocol/server-filesystem', '/path1', '/path2', ...]
						// Extract everything after the package name
						const packageIndex = server.args.findIndex(arg =>
							arg.includes('@modelcontextprotocol/server-filesystem'),
						);
						if (packageIndex !== -1) {
							const dirs = server.args.slice(packageIndex + 1);
							answers.allowedDirs = dirs.join(', ');
						}
					} else if (server.args) {
						// For other templates, join with space
						answers.args = server.args.join(' ');
					}

					if (server.env) {
						answers.envVars = Object.entries(server.env)
							.map(([key, value]) => `${key}=${value}`)
							.join('\n');
					}

					setFieldAnswers(answers);
					setCurrentValue(
						answers[template.fields[0]?.name] ||
							template.fields[0]?.default ||
							'',
					);
					setMultilineBuffer('');
					setError(null);
					setMode('field-input');
				}
			}
		}
	};

	const handleFieldSubmit = () => {
		if (!selectedTemplate) return;

		const currentField = selectedTemplate.fields[currentFieldIndex];
		if (!currentField) return;

		// For multiline fields, handle differently
		const isMultiline = currentField.name === 'envVars';
		const finalValue = isMultiline ? multilineBuffer : currentValue.trim();

		// Validate required fields
		if (currentField.required && !finalValue) {
			setError('This field is required');
			return;
		}

		// Validate with custom validator
		if (currentField.validator && finalValue) {
			const validationError = currentField.validator(finalValue);
			if (validationError) {
				setError(validationError);
				return;
			}
		}

		// Save answer
		const newAnswers = {
			...fieldAnswers,
			[currentField.name]: finalValue,
		};
		setFieldAnswers(newAnswers);
		setError(null);

		// Move to next field or complete
		if (currentFieldIndex < selectedTemplate.fields.length - 1) {
			setCurrentFieldIndex(currentFieldIndex + 1);
			const nextField = selectedTemplate.fields[currentFieldIndex + 1];
			setCurrentValue(newAnswers[nextField?.name] || nextField?.default || '');
			setMultilineBuffer('');
		} else {
			// Build config and add/update server
			try {
				const serverConfig = selectedTemplate.buildConfig(newAnswers);

				if (editingServerName !== null) {
					// Replace existing server (delete old, add new)
					const newServers = {...servers};
					delete newServers[editingServerName];
					newServers[serverConfig.name] = serverConfig;
					setServers(newServers);
				} else {
					// Add new server
					setServers({...servers, [serverConfig.name]: serverConfig});
				}

				// Reset for next server
				setSelectedTemplate(null);
				setCurrentFieldIndex(0);
				setFieldAnswers({});
				setCurrentValue('');
				setMultilineBuffer('');
				setEditingServerName(null);
				setMode('template-selection');
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'Failed to build configuration',
				);
			}
		}
	};

	useInput((input, key) => {
		// Handle Shift+Tab for going back
		if (key.shift && key.tab) {
			if (mode === 'field-input') {
				// In field input mode, check if we can go back to previous field
				if (currentFieldIndex > 0) {
					// Go back to previous field
					setCurrentFieldIndex(currentFieldIndex - 1);
					const prevField = selectedTemplate?.fields[currentFieldIndex - 1];
					setCurrentValue(
						fieldAnswers[prevField?.name || ''] || prevField?.default || '',
					);
					setMultilineBuffer('');
					setInputKey(prev => prev + 1); // Force remount to reset cursor position
					setError(null);
				} else {
					// At first field, go back based on where we came from
					if (editingServerName !== null) {
						// Was editing, go back to edit-or-delete choice
						setMode('edit-or-delete');
					} else {
						// Was adding, go back to template selection
						setMode('template-selection');
					}
					setSelectedTemplate(null);
					setCurrentFieldIndex(0);
					setFieldAnswers({});
					setCurrentValue('');
					setMultilineBuffer('');
					setError(null);
				}
			} else if (mode === 'edit-or-delete') {
				// In edit-or-delete, go back to edit selection
				setEditingServerName(null);
				setMode('edit-selection');
			} else if (mode === 'edit-selection') {
				// In edit selection, go back to template selection
				setMode('template-selection');
			} else if (mode === 'template-selection') {
				// At root level, call parent's onBack
				if (onBack) {
					onBack();
				}
			}
			return;
		}

		if (mode === 'field-input' && selectedTemplate) {
			const currentField = selectedTemplate.fields[currentFieldIndex];
			const isMultiline = currentField?.name === 'envVars';

			if (isMultiline) {
				// Handle multiline input
				if (key.return) {
					// Add newline to buffer
					setMultilineBuffer(multilineBuffer + '\n');
				} else if (key.escape) {
					// Submit multiline input on Escape
					handleFieldSubmit();
				} else if (!key.ctrl && !key.meta && input) {
					setMultilineBuffer(multilineBuffer + input);
				}
			} else {
				if (key.return) {
					handleFieldSubmit();
				} else if (key.escape) {
					// Go back to template selection
					setMode('template-selection');
					setSelectedTemplate(null);
					setCurrentFieldIndex(0);
					setFieldAnswers({});
					setCurrentValue('');
					setMultilineBuffer('');
					setError(null);
				}
			}
		}
	});

	if (mode === 'template-selection') {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color={colors.white}>
						Add MCP servers to extend Core with additional tools:
					</Text>
				</Box>
				{Object.keys(servers).length > 0 && (
					<Box marginBottom={1}>
						<Text color={colors.success}>
							Added: {Object.keys(servers).join(', ')}
						</Text>
					</Box>
				)}
				<SelectInput
					items={templateOptions}
					onSelect={(item: TemplateOption) => handleTemplateSelect(item)}
				/>
			</Box>
		);
	}

	if (mode === 'edit-selection') {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color={colors.white}>
						Select an MCP server to edit:
					</Text>
				</Box>
				<SelectInput
					items={editOptions}
					onSelect={(item: TemplateOption) => handleEditSelect(item)}
				/>
			</Box>
		);
	}

	if (mode === 'edit-or-delete') {
		const server =
			editingServerName !== null ? servers[editingServerName] : null;
		const editOrDeleteOptions = [
			{label: 'Edit this server', value: 'edit'},
			{label: 'Delete this server', value: 'delete'},
		];

		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text color={colors.white}>
						{server?.name} - What would you like to do?
					</Text>
				</Box>
				<SelectInput
					items={editOrDeleteOptions}
					onSelect={(item: {value: string}) => handleEditOrDeleteChoice(item)}
				/>
			</Box>
		);
	}

	if (mode === 'field-input' && selectedTemplate) {
		const currentField = selectedTemplate.fields[currentFieldIndex];
		if (!currentField) return null;

		const isMultiline = currentField.name === 'envVars';

		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color={colors.white}>
						{selectedTemplate.name} Configuration
					</Text>
					<Text dimColor>
						{' '}
						(Field {currentFieldIndex + 1}/{selectedTemplate.fields.length})
					</Text>
				</Box>

				<Box>
					<Text>
						{currentField.prompt}
						{currentField.required && <Text color={colors.error}> *</Text>}
						{currentField.default && (
							<Text dimColor> [{currentField.default}]</Text>
						)}
						: {currentField.sensitive && '****'}
					</Text>
				</Box>

				{isMultiline ? (
					<Box flexDirection="column" marginBottom={1}>
						<Box
							borderStyle="round"
							borderColor={colors.secondary}
							paddingX={1}
						>
							<Text>{multilineBuffer || <Text dimColor>(empty)</Text>}</Text>
						</Box>
						<Box marginTop={1}>
							<Text color={colors.secondary}>
								Type to add lines. Press Esc when done to submit.
							</Text>
						</Box>
					</Box>
				) : currentField.sensitive ? (
					<Box
						marginBottom={1}
						borderStyle="round"
						borderColor={colors.secondary}
					>
						<TextInput
							key={inputKey}
							value={currentValue}
							onChange={setCurrentValue}
							onSubmit={handleFieldSubmit}
							mask="*"
						/>
					</Box>
				) : (
					<Box
						marginBottom={1}
						borderStyle="round"
						borderColor={colors.secondary}
					>
						<TextInput
							key={inputKey}
							value={currentValue}
							onChange={setCurrentValue}
							onSubmit={handleFieldSubmit}
						/>
					</Box>
				)}

				{error && (
					<Box marginBottom={1}>
						<Text color={colors.error}>{error}</Text>
					</Box>
				)}

				{isNarrow ? (
					<Box flexDirection="column">
						<Text color={colors.white}>
							{isMultiline ? 'Esc: submit' : 'Enter: continue'}
						</Text>
						<Text color={colors.white}>Shift+Tab: go back</Text>
					</Box>
				) : (
					<Box>
						<Text color={colors.white}>
							{isMultiline
								? 'Press Esc to submit | Shift+Tab to go back'
								: 'Press Enter to continue | Shift+Tab to go back'}
						</Text>
					</Box>
				)}
			</Box>
		);
	}

	return null;
}
