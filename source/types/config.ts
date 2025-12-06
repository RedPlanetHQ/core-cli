import type {ThemePreset} from '@/types/ui';
import type {CodingAgentsConfig} from '@/types/coding-agents';

// AI provider configurations (OpenAI-compatible)
export interface AIProviderConfig {
	name: string;
	type: string;
	models: string[];
	requestTimeout?: number;
	socketTimeout?: number;
	connectionPool?: {
		idleTimeout?: number;
		cumulativeMaxIdleTimeout?: number;
	};
	config: {
		baseURL?: string;
		apiKey?: string;
		[key: string]: unknown;
	};
}

// Provider configuration type for wizard and config building
export interface ProviderConfig {
	name: string;
	baseUrl?: string;
	apiKey?: string;
	models: string[];
	requestTimeout?: number;
	socketTimeout?: number;
	organizationId?: string;
	timeout?: number;
	connectionPool?: {
		idleTimeout?: number;
		cumulativeMaxIdleTimeout?: number;
	};
	[key: string]: unknown; // Allow additional provider-specific config
}

export interface AppConfig extends CodingAgentsConfig {
	// Core authentication
	auth?: {
		url: string;
		apiKey: string;
	};

	// Assistant name
	assistantName?: string;

	// Providers array structure - all OpenAI compatible
	providers?: {
		name: string;
		baseUrl?: string;
		apiKey?: string;
		models: string[];
		requestTimeout?: number;
		socketTimeout?: number;
		connectionPool?: {
			idleTimeout?: number;
			cumulativeMaxIdleTimeout?: number;
		};
		[key: string]: unknown; // Allow additional provider-specific config
	}[];

	mcpServers?: {
		name: string;
		transport: 'stdio' | 'websocket' | 'http';
		command?: string;
		args?: string[];
		env?: Record<string, string>;
		url?: string;
		headers?: Record<string, string>;
		auth?: {
			type: 'bearer' | 'basic' | 'api-key' | 'custom';
			token?: string;
			username?: string;
			password?: string;
			apiKey?: string;
			customHeaders?: Record<string, string>;
		};
		timeout?: number;
		reconnect?: {
			enabled: boolean;
			maxAttempts: number;
			backoffMs: number;
		};
		description?: string;
		tags?: string[];
		enabled?: boolean;
	}[];

	// Last task sync timestamp (ISO string)
	lastTaskSync?: string;
}

export interface UserPreferences {
	lastProvider?: string;
	lastModel?: string;
	providerModels?: {
		[key in string]?: string;
	};
	lastUpdateCheck?: number;
	selectedTheme?: ThemePreset;
}
