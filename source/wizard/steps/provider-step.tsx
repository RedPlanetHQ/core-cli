import {useState, useEffect} from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import TextInput from 'ink-text-input';
import type {ProviderConfig} from '../../types/config';
import {
	PROVIDER_TEMPLATES,
	type ProviderTemplate,
} from '../templates/provider-templates';
import {colors} from '@/config/index';
import {useResponsiveTerminal} from '@/hooks/useTerminalWidth';

interface ProviderStepProps {
	onComplete: (providers: ProviderConfig[]) => void;
	onBack?: () => void;
	existingProviders?: ProviderConfig[];
}

type Mode =
	| 'select-template-or-custom'
	| 'template-selection'
	| 'edit-selection'
	| 'edit-or-delete'
	| 'field-input'
	| 'done';

interface TemplateOption {
	label: string;
	value: string;
}

export function ProviderStep({
	onComplete,
	onBack,
	existingProviders = [],
}: ProviderStepProps) {
	const {isNarrow} = useResponsiveTerminal();
	const [providers, setProviders] =
		useState<ProviderConfig[]>(existingProviders);

	// Update providers when existingProviders prop changes
	useEffect(() => {
		setProviders(existingProviders);
	}, [existingProviders]);

	const [mode, setMode] = useState<Mode>('select-template-or-custom');
	const [selectedTemplate, setSelectedTemplate] =
		useState<ProviderTemplate | null>(null);
	const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
	const [fieldAnswers, setFieldAnswers] = useState<Record<string, string>>({});
	const [currentValue, setCurrentValue] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [inputKey, setInputKey] = useState(0);
	const [cameFromCustom, setCameFromCustom] = useState(false);
	const [editingIndex, setEditingIndex] = useState<number | null>(null);

	const initialOptions = [
		{label: 'Choose from common templates', value: 'templates'},
		{label: 'Add custom provider manually', value: 'custom'},
		...(providers.length > 0
			? [{label: 'Edit existing providers', value: 'edit'}]
			: []),
		{label: 'Skip providers', value: 'skip'},
	];

	const templateOptions: TemplateOption[] = [
		...PROVIDER_TEMPLATES.map(template => ({
			label: template.name,
			value: template.id,
		})),
		{
			label: `Done adding providers`,
			value: 'done',
		},
	];

	const editOptions: TemplateOption[] = [
		...providers.map((provider, index) => ({
			label: `${index + 1}. ${provider.name}`,
			value: `edit-${index}`,
		})),
	];

	const handleInitialSelect = (item: {value: string}) => {
		if (item.value === 'templates') {
			setMode('template-selection');
			setCameFromCustom(false);
		} else if (item.value === 'custom') {
			// Find custom template
			const customTemplate = PROVIDER_TEMPLATES.find(t => t.id === 'custom');
			if (customTemplate) {
				setSelectedTemplate(customTemplate);
				setCurrentFieldIndex(0);
				setFieldAnswers({});
				setCurrentValue('');
				setMode('field-input');
				setCameFromCustom(true);
			}
		} else if (item.value === 'edit') {
			setMode('edit-selection');
		} else {
			// Skip
			onComplete(providers);
		}
	};

	const handleTemplateSelect = (item: TemplateOption) => {
		if (item.value === 'done') {
			onComplete(providers);
			return;
		}

		// Adding new provider
		const template = PROVIDER_TEMPLATES.find(t => t.id === item.value);
		if (template) {
			setEditingIndex(null); // Not editing
			setSelectedTemplate(template);
			setCurrentFieldIndex(0);
			setFieldAnswers({});
			setCurrentValue(template.fields[0]?.default || '');
			setError(null);
			setMode('field-input');
			setCameFromCustom(false);
		}
	};

	const handleEditSelect = (item: TemplateOption) => {
		// Store the index and show edit/delete options
		if (item.value.startsWith('edit-')) {
			const index = Number.parseInt(item.value.replace('edit-', ''), 10);
			setEditingIndex(index);
			setMode('edit-or-delete');
		}
	};

	const handleEditOrDeleteChoice = (item: {value: string}) => {
		if (item.value === 'delete' && editingIndex !== null) {
			// Delete the provider
			const newProviders = providers.filter((_, i) => i !== editingIndex);
			setProviders(newProviders);
			setEditingIndex(null);
			// Always go back to initial menu after deleting
			setMode('select-template-or-custom');
			return;
		}

		if (item.value === 'edit' && editingIndex !== null) {
			const provider = providers[editingIndex];
			if (provider) {
				// Find matching template (or use custom)
				const template =
					PROVIDER_TEMPLATES.find(t => t.id === provider.name) ||
					PROVIDER_TEMPLATES.find(t => t.id === 'custom');

				if (template) {
					setSelectedTemplate(template);
					setCurrentFieldIndex(0);

					// Pre-populate field answers from existing provider
					const answers: Record<string, string> = {};
					if (provider.name) answers.providerName = provider.name;
					if (provider.baseUrl) answers.baseUrl = provider.baseUrl;
					if (provider.apiKey) answers.apiKey = provider.apiKey;
					if (provider.models) answers.model = provider.models.join(', ');

					setFieldAnswers(answers);
					setCurrentValue(
						answers[template.fields[0]?.name] ||
							template.fields[0]?.default ||
							'',
					);
					setError(null);
					setMode('field-input');
					setCameFromCustom(false);
				}
			}
		}
	};

	const handleFieldSubmit = () => {
		if (!selectedTemplate) return;

		const currentField = selectedTemplate.fields[currentFieldIndex];
		if (!currentField) return;

		// Validate required fields
		if (currentField.required && !currentValue.trim()) {
			setError('This field is required');
			return;
		}

		// Validate with custom validator
		if (currentField.validator && currentValue.trim()) {
			const validationError = currentField.validator(currentValue);
			if (validationError) {
				setError(validationError);
				return;
			}
		}

		// Save answer
		const newAnswers = {
			...fieldAnswers,
			[currentField.name]: currentValue.trim(),
		};
		setFieldAnswers(newAnswers);
		setError(null);

		// Move to next field or complete
		if (currentFieldIndex < selectedTemplate.fields.length - 1) {
			setCurrentFieldIndex(currentFieldIndex + 1);
			const nextField = selectedTemplate.fields[currentFieldIndex + 1];
			setCurrentValue(newAnswers[nextField?.name] || nextField?.default || '');
		} else {
			// Build config and add/update provider
			try {
				const providerConfig = selectedTemplate.buildConfig(newAnswers);

				if (editingIndex !== null) {
					// Replace existing provider
					const newProviders = [...providers];
					newProviders[editingIndex] = providerConfig;
					setProviders(newProviders);
				} else {
					// Add new provider
					setProviders([...providers, providerConfig]);
				}

				// Reset for next provider
				setSelectedTemplate(null);
				setCurrentFieldIndex(0);
				setFieldAnswers({});
				setCurrentValue('');
				setEditingIndex(null);
				setMode('template-selection');
			} catch (err) {
				setError(
					err instanceof Error ? err.message : 'Failed to build configuration',
				);
			}
		}
	};

	useInput((_input, key) => {
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
					setInputKey(prev => prev + 1); // Force remount to reset cursor position
					setError(null);
				} else {
					// At first field, go back based on where we came from
					if (editingIndex !== null) {
						// Was editing, go back to edit-or-delete choice
						setMode('edit-or-delete');
					} else if (cameFromCustom) {
						// Came from custom selection, go back to initial choice
						setMode('select-template-or-custom');
					} else {
						// Came from template selection, go back there
						setMode('template-selection');
					}
					setSelectedTemplate(null);
					setCurrentFieldIndex(0);
					setFieldAnswers({});
					setCurrentValue('');
					setError(null);
				}
			} else if (mode === 'template-selection') {
				// In template selection, go back to initial choice
				setMode('select-template-or-custom');
			} else if (mode === 'edit-or-delete') {
				// In edit-or-delete, go back to edit selection
				setEditingIndex(null);
				setMode('edit-selection');
			} else if (mode === 'edit-selection') {
				// In edit selection, go back to initial choice
				setMode('select-template-or-custom');
			} else if (mode === 'select-template-or-custom') {
				// At root level, call parent's onBack
				if (onBack) {
					onBack();
				}
			}
			return;
		}

		if (mode === 'field-input') {
			if (key.return) {
				handleFieldSubmit();
			} else if (key.escape) {
				// Go back to template selection
				setMode('template-selection');
				setSelectedTemplate(null);
				setCurrentFieldIndex(0);
				setFieldAnswers({});
				setCurrentValue('');
				setError(null);
			}
		}
	});

	if (mode === 'select-template-or-custom') {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color={colors.white}>
						Let's add AI providers. Would you like to use a template?
					</Text>
				</Box>
				{providers.length > 0 && (
					<Box marginBottom={1}>
						<Text color={colors.success}>
							{providers.length} provider(s) already added
						</Text>
					</Box>
				)}
				<SelectInput
					items={initialOptions}
					onSelect={(item: {value: string}) => handleInitialSelect(item)}
				/>
			</Box>
		);
	}

	if (mode === 'template-selection') {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color={colors.white}>
						Choose a provider template:
					</Text>
				</Box>
				{providers.length > 0 && (
					<Box marginBottom={1}>
						<Text color={colors.success}>
							Added: {providers.map(p => p.name).join(', ')}
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
						Select a provider to edit:
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
		const provider = editingIndex !== null ? providers[editingIndex] : null;
		const editOrDeleteOptions = [
			{label: 'Edit this provider', value: 'edit'},
			{label: 'Delete this provider', value: 'delete'},
		];

		return (
			<Box flexDirection="column">
				<Box marginBottom={1}>
					<Text bold color={colors.white}>
						{provider?.name} - What would you like to do?
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
						{currentField.required && (
							<Text color={colors.error}> *</Text>
						)}: {currentField.sensitive && '****'}
					</Text>
				</Box>

				{!currentField.sensitive && (
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

				{currentField.sensitive && (
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
				)}

				{error && (
					<Box marginBottom={1}>
						<Text color={colors.error}>{error}</Text>
					</Box>
				)}

				{isNarrow ? (
					<Box flexDirection="column">
						<Text color={colors.secondary}>Enter: continue</Text>
						<Text color={colors.secondary}>Shift+Tab: go back</Text>
					</Box>
				) : (
					<Box>
						<Text color={colors.secondary}>
							Press Enter to continue | Shift+Tab to go back
						</Text>
					</Box>
				)}
			</Box>
		);
	}

	return null;
}
