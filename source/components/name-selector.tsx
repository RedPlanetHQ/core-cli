import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import {saveAssistantName, getAssistantName} from '@/config/preferences';
import {useTheme} from '@/hooks/useTheme';

const ASSISTANT_NAMES = [
	{name: 'Sol', description: 'Radiant and illuminating'},
	{name: 'Aria', description: 'Melodious and graceful'},
	{name: 'Nova', description: 'Bright and innovative'},
	{name: 'Atlas', description: 'Strong and reliable'},
	{name: 'Sage', description: 'Wise and knowledgeable'},
	{name: 'Echo', description: 'Responsive and attentive'},
	{name: 'Custom', description: 'Enter your own name'},
];

interface NameSelectorProps {
	onNameSelect: (name: string) => void;
	onCancel: () => void;
}

export default function NameSelector({
	onNameSelect,
	onCancel,
}: NameSelectorProps) {
	const {colors} = useTheme();
	const currentName = getAssistantName();
	const [selectedIndex, setSelectedIndex] = useState(() => {
		if (currentName) {
			const index = ASSISTANT_NAMES.findIndex(n => n.name === currentName);
			return index >= 0 ? index : 0;
		}
		return 0;
	});
	const [isCustomInput, setIsCustomInput] = useState(false);
	const [customName, setCustomName] = useState('');

	useInput((input, key) => {
		// If in custom input mode, don't handle navigation
		if (isCustomInput) {
			if (key.escape) {
				// Go back to selection
				setIsCustomInput(false);
				setCustomName('');
			}
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
			if (ASSISTANT_NAMES[selectedIndex].name === 'Custom') {
				setIsCustomInput(true);
			} else {
				// Save selection and complete
				const selectedName = ASSISTANT_NAMES[selectedIndex].name;
				saveAssistantName(selectedName);
				onNameSelect(selectedName);
			}
		} else if (key.escape) {
			// Cancel
			onCancel();
		}
	});

	const handleCustomNameSubmit = () => {
		if (customName.trim()) {
			saveAssistantName(customName.trim());
			onNameSelect(customName.trim());
		} else {
			// If empty, go back to selection
			setIsCustomInput(false);
		}
	};

	if (isCustomInput) {
		return (
			<Box flexDirection="column" marginBottom={1}>
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
						<Text color={colors.primary} bold>
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
		<Box flexDirection="column" marginBottom={1}>
			<Box marginBottom={1} flexDirection="column">
				<Text color={colors.primary} bold>
					Change Assistant Name
				</Text>
				<Text color={colors.white} dimColor>
					{currentName
						? `Current name: ${currentName}`
						: 'No name currently set'}
				</Text>
			</Box>

			<Box flexDirection="column" marginBottom={1}>
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

			<Box>
				<Text color={colors.secondary} dimColor>
					Use ↑↓ arrows to navigate, Enter to select, Esc to cancel
				</Text>
			</Box>
		</Box>
	);
}
