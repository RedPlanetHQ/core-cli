import {Box, Text} from 'ink';
import {memo} from 'react';

import {useTheme} from '@/hooks/useTheme';

import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read package.json once at module load time to avoid repeated file reads
const packageJson = JSON.parse(
	fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf8'),
) as {version: string};

export default memo(function WelcomeMessage() {
	const {colors} = useTheme();

	return (
		<Box flexDirection="column" marginBottom={1}>
			<Box gap={1}>
				<Box flexDirection="column">
					<Text color={colors.primary}> ●─────●</Text>
					<Text color={colors.primary}> ╱│╲ ╱│╲</Text>
					<Text color={colors.primary}>● │ ●─● │ ●</Text>
					<Text color={colors.primary}> ╲│╱ ╲│╱</Text>
					<Text color={colors.primary}> ●─────●</Text>
				</Box>
				<Box flexDirection="column" justifyContent="center">
					<Text color={colors.white} bold>
						CORE{' '}
					</Text>
					<Text color={colors.white} dimColor>
						v{packageJson.version}
					</Text>
					<Text color={colors.white} dimColor>
						Your AI task management assistant
					</Text>
				</Box>
			</Box>
		</Box>
	);
});
