import React, {useEffect, useState} from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {useTheme} from '@/hooks/useTheme';
import {LLMClient} from '@/types/core';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';

interface ModelSelectorProps {
	client: LLMClient | null;
	currentModel: string;
	onModelSelect: (model: string) => void;
	onCancel: () => void;
}

interface ModelOption {
	label: string;
	value: string;
}

export default function ModelSelector({
	client,
	currentModel,
	onModelSelect,
	onCancel,
}: ModelSelectorProps) {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();
	const [models, setModels] = useState<ModelOption[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// Handle escape key to cancel
	useInput((_, key) => {
		if (key.escape) {
			onCancel();
		}
	});

	useEffect(() => {
		const loadModels = async () => {
			if (!client) {
				setError('No active client found');
				setLoading(false);
				return;
			}

			try {
				const availableModels = await client.getAvailableModels();

				if (availableModels.length === 0) {
					setError('No models available. Please check your configuration.');
					setLoading(false);
					return;
				}

				const modelOptions: ModelOption[] = availableModels.map(model => ({
					label: `${model}${model === currentModel ? ' (current)' : ''}`,
					value: model,
				}));

				setModels(modelOptions);
				setLoading(false);
			} catch (err) {
				setError(`Error accessing models: ${String(err)}`);
				setLoading(false);
			}
		};

		void loadModels();
	}, [client, currentModel]);

	const handleSelect = (item: ModelOption) => {
		onModelSelect(item.value);
	};

	if (loading) {
		return (
			<TitledBox
				key={colors.white}
				borderStyle="round"
				titles={['Model Selection']}
				titleStyles={titleStyles.pill}
				width={boxWidth}
				borderColor={colors.white}
				paddingX={2}
				paddingY={1}
				marginBottom={1}
			>
				<Text color={colors.secondary}>Loading available models...</Text>
			</TitledBox>
		);
	}

	if (error) {
		return (
			<TitledBox
				borderStyle="round"
				titles={['Model Selection - Error']}
				titleStyles={titleStyles.pill}
				width={boxWidth}
				borderColor={colors.error}
				paddingX={2}
				paddingY={1}
				marginBottom={1}
			>
				<Box flexDirection="column">
					<Text color={colors.error}>{error}</Text>
					<Text color={colors.secondary}>
						Make sure your provider is properly configured.
					</Text>
					<Box marginTop={1}>
						<Text color={colors.white} dimColor>
							Press Escape to cancel
						</Text>
					</Box>
				</Box>
			</TitledBox>
		);
	}

	return (
		<TitledBox
			borderStyle="round"
			titles={['Select a Model']}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.white}
			paddingX={2}
			paddingY={1}
			marginBottom={1}
		>
			<Box flexDirection="column">
				<SelectInput items={models} onSelect={handleSelect} />
				<Box marginTop={1}>
					<Text color={colors.white} dimColor>
						Press Escape to cancel
					</Text>
				</Box>
			</Box>
		</TitledBox>
	);
}
