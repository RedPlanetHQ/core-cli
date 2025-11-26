import {Command} from '@/types/index';
import {commandRegistry} from '@/commands';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import React from 'react';
import {TitledBox, titleStyles} from '@mishieck/ink-titled-box';
import {Box, Text} from 'ink';
import {useTerminalWidth} from '@/hooks/useTerminalWidth';
import {useTheme} from '@/hooks/useTheme';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageJson = JSON.parse(
	fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'),
) as {version: string};

function Help({
	version,
	commands,
}: {
	version: string;
	commands: Array<{name: string; description: string}>;
}) {
	const boxWidth = useTerminalWidth();
	const {colors} = useTheme();
	return (
		<TitledBox
			key={colors.primary}
			borderStyle="round"
			titles={['/help']}
			titleStyles={titleStyles.pill}
			width={boxWidth}
			borderColor={colors.primary}
			paddingX={2}
			paddingY={1}
			flexDirection="column"
			marginBottom={1}
		>
			<Box marginBottom={1}>
				<Text color={colors.primary} bold>
					Core – {version}
				</Text>
			</Box>

			<Text color={colors.white}>
				An AI-powered task management assistant that helps you stay organized.
				Chat naturally to manage tasks, sync with integrations like GitHub and
				Linear, and keep track of your work.
			</Text>

			<Box marginTop={1}>
				<Text color={colors.primary} bold>
					What you can do:
				</Text>
			</Box>
			<Text color={colors.white}>
				{' '}
				• "Show me my tasks for today"
			</Text>
			<Text color={colors.white}> • "Create a task to fix the login bug"</Text>
			<Text color={colors.white}> • "What did I work on yesterday?"</Text>
			<Text color={colors.white}> • "Mark task #5 as complete"</Text>
			<Text color={colors.white}> • Use /sync to pull tasks from GitHub, Linear, etc.</Text>

			<Box marginTop={1}>
				<Text color={colors.primary} bold>
					Commands:
				</Text>
			</Box>
			{commands.length === 0 ? (
				<Text color={colors.white}> No commands available.</Text>
			) : (
				commands.map((cmd, index) => (
					<Text key={index} color={colors.white}>
						{' '}
						• /{cmd.name} - {cmd.description}
					</Text>
				))
			)}
		</TitledBox>
	);
}

export const helpCommand: Command = {
	name: 'help',
	description: 'Show available commands',
	handler: (_args: string[], _messages, _metadata) => {
		const commands = commandRegistry.getAll();

		return Promise.resolve(
			React.createElement(Help, {
				key: `help-${Date.now()}`,
				version: packageJson.version,
				commands: commands,
			}),
		);
	},
};
