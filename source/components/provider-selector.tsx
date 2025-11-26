import {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {appConfig} from '@/config/index';
import {useTheme} from '@/hooks/useTheme';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';

interface ProviderSelectorProps {
	currentProvider: string;
	onProviderSelect: (provider: string) => void;
	onCancel: () => void;
}

interface ProviderOption {
	label: string;
	value: string;
}

export default function ProviderSelector({
	currentProvider,
	onProviderSelect,
	onCancel,
}: ProviderSelectorProps) {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();

	const getProviderOptions = (): ProviderOption[] => {
		const options: ProviderOption[] = [];

		if (appConfig.providers) {
			for (const provider of appConfig.providers) {
				options.push({
					label: `${provider.name}${
						currentProvider === provider.name ? ' (current)' : ''
					}`,
					value: provider.name,
				});
			}
		}

		return options;
	};

	const [providers] = useState<ProviderOption[]>(getProviderOptions());

	// Handle escape key to cancel
	useInput((_, key) => {
		if (key.escape) {
			onCancel();
		}
	});

	const handleSelect = (item: ProviderOption) => {
		onProviderSelect(item.value);
	};

	return (
		<TitledBox
			key={colors.white}
			borderStyle="round"
			titles={['Select a Provider']}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.white}
			paddingX={2}
			paddingY={1}
			marginBottom={1}
		>
			<Box flexDirection="column">
				<SelectInput items={providers} onSelect={handleSelect} />
				<Box marginTop={1}>
					<Text color={colors.white} dimColor>
						Press Escape to cancel
					</Text>
				</Box>
			</Box>
		</TitledBox>
	);
}
