import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import {colors} from '@/config/index';

interface AssistantNameStepProps {
	onComplete: (name: string) => void;
	onBack?: () => void;
	existingName?: string;
}

const ASSISTANT_NAMES = [
	{name: 'Sol', description: 'Radiant and illuminating'},
	{name: 'Aria', description: 'Melodious and graceful'},
	{name: 'Nova', description: 'Bright and innovative'},
	{name: 'Atlas', description: 'Strong and reliable'},
	{name: 'Sage', description: 'Wise and knowledgeable'},
	{name: 'Echo', description: 'Responsive and attentive'},
	{name: 'Custom', description: 'Enter your own name'},
];

export function AssistantNameStep({
	onComplete,
	onBack,
	existingName,
}: AssistantNameStepProps) {
	const [selectedIndex, setSelectedIndex] = useState(() => {
		if (existingName) {
			const index = ASSISTANT_NAMES.findIndex(n => n.name === existingName);
			return index >= 0 ? index : 0;
		}
		return 0;
	});
	const [isCustomInput, setIsCustomInput] = useState(false);
	const [customName, setCustomName] = useState('');

	useInput((input, key) => {
		// If in custom input mode, don't handle navigation
		if (isCustomInput) {
			return;
		}

		// Handle arrow keys for navigation
		if (key.upArrow) {
			setSelectedIndex(prev =>
				prev > 0 ? prev - 1 : ASSISTANT_NAMES.length - 1,
			);
		} else if (key.downArrow) {
			setSelectedIndex(prev =>
				prev < ASSISTANT_NAMES.length - 1 ? prev + 1 : 0,
			);
		} else if (key.return) {
			// Check if Custom option is selected
			if (ASSISTANT_NAMES[selectedIndex]!.name === 'Custom') {
				setIsCustomInput(true);
			} else {
				// Submit selection
				onComplete(ASSISTANT_NAMES[selectedIndex]!.name);
			}
		} else if (key.escape || (key.tab && key.shift)) {
			// Go back
			if (onBack) {
				onBack();
			}
		}
	});

	const handleCustomNameSubmit = () => {
		if (customName.trim()) {
			onComplete(customName.trim());
		} else {
			// If empty, go back to selection
			setIsCustomInput(false);
		}
	};

	if (isCustomInput) {
		return (
			<Box flexDirection="column">
				<Box marginBottom={1} flexDirection="column">
					<Text color={colors.white} bold>
						Enter Custom Name
					</Text>
					<Text color={colors.white} dimColor>
						Type your preferred assistant name
					</Text>
				</Box>

				<Box flexDirection="column" marginBottom={1}>
					<Box>
						<Text color={colors.white} bold>
							Name:{' '}
						</Text>
					</Box>
					<Box marginLeft={2}>
						<TextInput
							value={customName}
							onChange={setCustomName}
							onSubmit={handleCustomNameSubmit}
							placeholder="Enter name..."
						/>
					</Box>
				</Box>

				<Box>
					<Text color={colors.secondary} dimColor>
						Press Enter to confirm, Esc to go back
					</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column">
			<Box marginBottom={1} flexDirection="column">
				<Text color={colors.white} bold>
					Choose Your Assistant's Name
				</Text>
				<Text color={colors.white} dimColor>
					Select a name for your AI assistant
				</Text>
			</Box>

			<Box flexDirection="column">
				{ASSISTANT_NAMES.map((option, index) => {
					const isSelected = index === selectedIndex;
					return (
						<Box key={option.name} marginBottom={1}>
							<Box width={2}>
								<Text color={isSelected ? colors.success : colors.muted}>
									{isSelected ? '▶' : ' '}
								</Text>
							</Box>
							<Box flexDirection="column">
								<Text
									color={isSelected ? colors.success : colors.white}
									bold={isSelected}
								>
									{option.name}
								</Text>
								<Text color={colors.muted} dimColor>
									{option.description}
								</Text>
							</Box>
						</Box>
					);
				})}
			</Box>

			<Box marginTop={1}>
				<Text color={colors.secondary} dimColor>
					Use ↑↓ arrows to navigate, Enter to select
				</Text>
			</Box>
		</Box>
	);
}
