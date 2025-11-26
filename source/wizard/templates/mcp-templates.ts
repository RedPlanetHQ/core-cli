import type {TemplateField} from './provider-templates';

export type McpTransportType = 'stdio' | 'websocket' | 'http';

export interface McpServerConfig {
	name: string;
	transport: McpTransportType;

	// STDIO-specific
	command?: string;
	args?: string[];
	env?: Record<string, string>;

	// Remote transport-specific
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

	// Common
	description?: string;
	tags?: string[];
	enabled?: boolean;
}

export interface McpTemplate {
	id: string;
	name: string;
	description: string;
	command: string;
	fields: TemplateField[];
	buildConfig: (answers: Record<string, string>) => McpServerConfig;
}

export const MCP_TEMPLATES: McpTemplate[] = [
	{
		id: 'filesystem',
		name: 'Filesystem',
		description: 'Read/write files and directories',
		command: 'npx',
		fields: [
			{
				name: 'allowedDirs',
				prompt: 'Allowed directories (comma-separated paths)',
				required: true,
			},
		],
		buildConfig: answers => ({
			name: 'filesystem',
			transport: 'stdio' as McpTransportType,
			command: 'npx',
			args: [
				'-y',
				'@modelcontextprotocol/server-filesystem',
				...answers.allowedDirs
					.split(',')
					.map(d => d.trim())
					.filter(Boolean),
			],
			description: 'Read/write files and directories',
			tags: ['filesystem', 'local'],
		}),
	},
	{
		id: 'postgres',
		name: 'PostgreSQL',
		description: 'Database queries and management',
		command: 'npx',
		fields: [
			{
				name: 'connectionString',
				prompt: 'Connection string (postgresql://user:pass@host:port/db)',
				required: true,
				sensitive: true,
			},
		],
		buildConfig: answers => ({
			name: 'postgres',
			transport: 'stdio' as McpTransportType,
			command: 'npx',
			args: ['-y', '@modelcontextprotocol/server-postgres'],
			env: {
				POSTGRES_CONNECTION_STRING: answers.connectionString,
			},
			description: 'Database queries and management',
			tags: ['database', 'postgres', 'sql'],
		}),
	},
	{
		id: 'fetch',
		name: 'Fetch',
		description: 'HTTP requests and web scraping',
		command: 'npx',
		fields: [
			{
				name: 'userAgent',
				prompt: 'User-Agent string (optional)',
				required: false,
				default: 'ModelContextProtocol/1.0',
			},
		],
		buildConfig: answers => {
			const config: McpServerConfig = {
				name: 'fetch',
				transport: 'stdio' as McpTransportType,
				command: 'npx',
				args: ['-y', '@modelcontextprotocol/server-fetch'],
				description: 'HTTP requests and web scraping',
				tags: ['http', 'scraping', 'fetch', 'stdio'],
			};
			if (answers.userAgent) {
				config.env = {USER_AGENT: answers.userAgent};
			}
			return config;
		},
	},
	{
		id: 'custom',
		name: 'Custom MCP Server',
		description: 'Custom MCP server configuration',
		command: '',
		fields: [
			{
				name: 'transport',
				prompt: 'Transport type (stdio, http, websocket)',
				required: true,
				default: 'stdio',
			},
			{
				name: 'serverName',
				prompt: 'Server name',
				required: true,
			},
			{
				name: 'url',
				prompt: 'Server URL (for http/websocket transports)',
				required: false,
			},
			{
				name: 'command',
				prompt: 'Command (for stdio transport)',
				required: false,
			},
			{
				name: 'args',
				prompt: 'Arguments (space-separated, for stdio transport)',
				required: false,
			},
			{
				name: 'envVars',
				prompt: 'Environment variables (KEY=VALUE, one per line, optional)',
				required: false,
			},
		],
		buildConfig: answers => {
			const config: McpServerConfig = {
				name: answers.serverName,
				transport: (answers.transport || 'stdio') as McpTransportType,
				description: 'Custom MCP server configuration',
				tags: ['custom'],
			};

			// Configure based on transport type
			const transport = answers.transport || 'stdio';
			if (transport === 'stdio') {
				if (!answers.command) {
					throw new Error('Command is required for stdio transport');
				}
				config.command = answers.command;
				config.args = answers.args
					? answers.args
							.split(' ')
							.map(arg => arg.trim())
							.filter(Boolean)
					: [];
			} else if (transport === 'http' || transport === 'websocket') {
				if (!answers.url) {
					throw new Error('URL is required for http/websocket transports');
				}
				config.url = answers.url;
				config.timeout = 30000; // 30 seconds default timeout
			}

			if (answers.envVars) {
				config.env = {};
				const lines = answers.envVars.split('\n');
				for (const line of lines) {
					const trimmed = line.trim();
					if (!trimmed) continue;
					const [key, ...valueParts] = trimmed.split('=');
					if (key && valueParts.length > 0) {
						config.env[key.trim()] = valueParts.join('=').trim();
					}
				}
			}

			return config;
		},
	},
	{
		id: 'deepwiki',
		name: 'DeepWiki Remote',
		description: 'Remote MCP server for wiki documentation and research',
		command: '',
		fields: [
			{
				name: 'serverName',
				prompt: 'Server name',
				required: true,
				default: 'deepwiki',
			},
			{
				name: 'url',
				prompt: 'Server URL',
				required: true,
				default: 'https://mcp.deepwiki.com/mcp',
			},
		],
		buildConfig: answers => ({
			name: answers.serverName || 'deepwiki',
			transport: 'http' as McpTransportType,
			url: answers.url || 'https://mcp.deepwiki.com/mcp',
			description: 'Remote MCP server for wiki documentation and research',
			tags: ['remote', 'wiki', 'documentation', 'http'],
			timeout: 30000,
		}),
	},
	{
		id: 'sequential-thinking',
		name: 'Sequential Thinking Remote',
		description: 'Remote MCP server for enhanced reasoning and analysis',
		command: '',
		fields: [
			{
				name: 'serverName',
				prompt: 'Server name',
				required: true,
				default: 'sequential-thinking',
			},
			{
				name: 'url',
				prompt: 'Server URL',
				required: true,
				default: 'https://remote.mcpservers.org/sequentialthinking/mcp',
			},
		],
		buildConfig: answers => ({
			name: answers.serverName || 'sequential-thinking',
			transport: 'http' as McpTransportType,
			url:
				answers.url || 'https://remote.mcpservers.org/sequentialthinking/mcp',
			description: 'Remote MCP server for enhanced reasoning and analysis',
			tags: ['remote', 'reasoning', 'analysis', 'http'],
			timeout: 30000,
		}),
	},
	{
		id: 'context7',
		name: 'Context7 Remote',
		description: 'Remote MCP server for contextual information retrieval',
		command: '',
		fields: [
			{
				name: 'serverName',
				prompt: 'Server name',
				required: true,
				default: 'context7',
			},
			{
				name: 'url',
				prompt: 'Server URL',
				required: true,
				default: 'https://mcp.context7.com/mcp',
			},
		],
		buildConfig: answers => ({
			name: answers.serverName || 'context7',
			transport: 'http' as McpTransportType,
			url: answers.url || 'https://mcp.context7.com/mcp',
			description: 'Remote MCP server for contextual information retrieval',
			tags: ['remote', 'context', 'information', 'http'],
			timeout: 30000,
		}),
	},
	{
		id: 'remote-fetch',
		name: 'Remote Fetch Server',
		description: 'Remote MCP server for HTTP requests and web scraping',
		command: '',
		fields: [
			{
				name: 'serverName',
				prompt: 'Server name',
				required: true,
				default: 'remote-fetch',
			},
			{
				name: 'url',
				prompt: 'Server URL',
				required: true,
				default: 'https://remote.mcpservers.org/fetch/mcp',
			},
		],
		buildConfig: answers => ({
			name: answers.serverName || 'remote-fetch',
			transport: 'http' as McpTransportType,
			url: answers.url || 'https://remote.mcpservers.org/fetch/mcp',
			description: 'Remote MCP server for HTTP requests and web scraping',
			tags: ['remote', 'http', 'scraping', 'fetch'],
			timeout: 30000,
		}),
	},
];
