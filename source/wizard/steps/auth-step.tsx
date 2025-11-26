import React, {useState} from 'react';
import {Box, Text, useInput} from 'ink';
import TextInput from 'ink-text-input';
import {colors} from '@/config/index';

export interface CoreAuthConfig {
	url: string;
	apiKey: string;
}

interface AuthStepProps {
	onComplete: (auth: CoreAuthConfig) => void;
	onBack?: () => void;
	existingAuth?: CoreAuthConfig;
}

type Field = 'url' | 'apiKey';

export function AuthStep({onComplete, onBack, existingAuth}: AuthStepProps) {
	const [url, setUrl] = useState(existingAuth?.url || 'https://core.heysol.ai');
	const [apiKey, setApiKey] = useState(existingAuth?.apiKey || '');
	const [currentField, setCurrentField] = useState<Field>('url');
	const [error, setError] = useState<string | null>(null);

	const handleSubmit = () => {
		// Validate URL field
		if (currentField === 'url') {
			if (!url.trim()) {
				setError('URL is required');
				return;
			}

			// Basic URL validation
			try {
				new URL(url);
			} catch {
				setError('Please enter a valid URL');
				return;
			}

			setError(null);
			setCurrentField('apiKey');
			return;
		}

		// Validate API key field
		if (currentField === 'apiKey') {
			if (!apiKey.trim()) {
				setError('API key is required');
				return;
			}

			setError(null);
			onComplete({url: url.trim(), apiKey: apiKey.trim()});
		}
	};

	useInput((input, key) => {
		// Handle Escape key
		if (key.escape) {
			if (onBack && currentField === 'apiKey') {
				setCurrentField('url');
				setError(null);
			}
			return;
		}

		// Handle Shift+Tab for going back
		if (key.tab && key.shift && onBack) {
			if (currentField === 'apiKey') {
				setCurrentField('url');
				setError(null);
			}
		}
	});

	return (
		<Box flexDirection="column">
			<Box marginBottom={1} flexDirection="column">
				<Text color={colors.white} bold>
					Connect to Core
				</Text>
				<Text color={colors.white} dimColor>
					Enter your Core API URL and authentication key
				</Text>
			</Box>

			{/* URL Field */}
			<Box flexDirection="column" marginBottom={1}>
				<Box>
					<Text color={colors.white} bold>
						Core URL:{' '}
					</Text>
				</Box>
				<Box marginLeft={2}>
					{currentField === 'url' ? (
						<TextInput
							value={url}
							onChange={setUrl}
							onSubmit={handleSubmit}
							placeholder="https://api.core.example.com"
						/>
					) : (
						<Text color={colors.success}>{url || '(not set)'}</Text>
					)}
				</Box>
			</Box>

			{/* API Key Field */}
			{currentField === 'apiKey' && (
				<Box flexDirection="column" marginBottom={1}>
					<Box>
						<Text color={colors.white} bold>
							API Key:{' '}
						</Text>
					</Box>
					<Box marginLeft={2}>
						<TextInput
							value={apiKey}
							onChange={setApiKey}
							onSubmit={handleSubmit}
							placeholder="your-api-key"
							mask="*"
						/>
					</Box>
				</Box>
			)}

			{/* Error Message */}
			{error && (
				<Box marginBottom={1}>
					<Text color={colors.error}>✗ {error}</Text>
				</Box>
			)}
		</Box>
	);
}
