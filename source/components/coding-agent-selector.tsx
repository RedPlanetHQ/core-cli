/**
 * Coding agent selector component
 * Similar to provider-selector but for coding agents
 */

import {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import SelectInput from 'ink-select-input';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {useTheme} from '@/hooks/useTheme';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';
import {CODING_AGENTS} from '@/config/coding-agents';
import {isAgentInstalled} from '@/utils/tmux-manager';
import {appConfig} from '@/config/index';

interface CodingAgentSelectorProps {
	currentAgent?: string;
	onAgentSelect: (agent: string) => void;
	onCancel: () => void;
}

interface AgentOption {
	label: string;
	value: string;
	disabled?: boolean;
}

export default function CodingAgentSelector({
	currentAgent,
	onAgentSelect,
	onCancel,
}: CodingAgentSelectorProps) {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();

	const getAgentOptions = (): AgentOption[] => {
		const options: AgentOption[] = [];

		for (const [agentName, agentConfig] of Object.entries(CODING_AGENTS)) {
			// Check if agent is enabled in config
			const isEnabled = appConfig.codingAgents?.[agentName]?.enabled ?? true;
			const customPath = appConfig.codingAgents?.[agentName]?.path;

			// Check if agent command is installed
			const installed = isEnabled && isAgentInstalled(agentConfig, customPath);

			let label = agentConfig.displayName;
			if (currentAgent === agentName) {
				label += ' (current)';
			}
			if (installed) {
				label += ' ✓';
			} else {
				label += ' (not installed)';
			}

			options.push({
				label,
				value: agentName,
				disabled: !installed,
			});
		}

		return options;
	};

	const [agents] = useState<AgentOption[]>(getAgentOptions());

	// Handle escape key to cancel
	useInput((_, key) => {
		if (key.escape) {
			onCancel();
		}
	});

	const handleSelect = (item: AgentOption) => {
		if (!item.disabled) {
			onAgentSelect(item.value);
		}
	};

	return (
		<TitledBox
			key={colors.white}
			borderStyle="round"
			titles={['Select Default Coding Agent']}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.white}
			paddingX={2}
			paddingY={1}
			marginBottom={1}
		>
			<Box flexDirection="column">
				<SelectInput items={agents} onSelect={handleSelect} />
				<Box marginTop={1}>
					<Text color={colors.white} dimColor>
						Press Escape to cancel
					</Text>
				</Box>
			</Box>
		</TitledBox>
	);
}
