import {readFileSync, writeFileSync, existsSync} from 'fs';
import {logError} from '@/utils/message-queue';
import {getClosestConfigFile} from '@/config/index';
import {join} from 'path';
import {getConfigPath} from '@/config/paths';

import type {UserPreferences, AppConfig} from '@/types/index';

let PREFERENCES_PATH: string | null = null;

function getPreferencesPath(): string {
	if (!PREFERENCES_PATH) {
		PREFERENCES_PATH = getClosestConfigFile('core-preferences.json');
	}
	return PREFERENCES_PATH;
}

export function loadPreferences(): UserPreferences {
	try {
		const data = readFileSync(getPreferencesPath(), 'utf-8');
		return JSON.parse(data) as UserPreferences;
	} catch (error) {
		logError(`Failed to load preferences: ${String(error)}`);
	}
	return {};
}

export function savePreferences(preferences: UserPreferences): void {
	try {
		writeFileSync(getPreferencesPath(), JSON.stringify(preferences, null, 2));
	} catch (error) {
		logError(`Failed to save preferences: ${String(error)}`);
	}
}

export function updateLastUsed(provider: string, model: string): void {
	const preferences = loadPreferences();
	preferences.lastProvider = provider;
	preferences.lastModel = model;

	// Also save the model for this specific provider
	if (!preferences.providerModels) {
		preferences.providerModels = {};
	}
	preferences.providerModels[provider] = model;

	savePreferences(preferences);
}

export function getLastUsedModel(provider: string): string | undefined {
	const preferences = loadPreferences();
	return preferences.providerModels?.[provider];
}

export function saveAssistantName(name: string): void {
	try {
		const configPath = join(getConfigPath(), 'config.json');
		let config: {core: AppConfig} = {core: {}};

		// Load existing config if it exists
		if (existsSync(configPath)) {
			const configContent = readFileSync(configPath, 'utf-8');
			config = JSON.parse(configContent);
			if (!config.core) {
				config.core = {};
			}
		}

		// Update assistant name
		config.core.assistantName = name;

		// Write back to config
		writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
	} catch (error) {
		logError(`Failed to save assistant name: ${String(error)}`);
	}
}

export function getAssistantName(): string | undefined {
	try {
		const configPath = join(getConfigPath(), 'config.json');
		if (!existsSync(configPath)) {
			return 'Core';
		}

		const configContent = readFileSync(configPath, 'utf-8');
		const config = JSON.parse(configContent) as {core?: AppConfig};
		return config.core?.assistantName ?? 'Core';
	} catch (error) {
		logError(`Failed to load assistant name: ${String(error)}`);
		return undefined;
	}
}
