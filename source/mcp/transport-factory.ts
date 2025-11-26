import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';
import {WebSocketClientTransport} from '@modelcontextprotocol/sdk/client/websocket.js';
import {StreamableHTTPClientTransport} from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type {MCPServer, MCPTransportType} from '../types/mcp.js';

// Union type for all supported client transports
type ClientTransport =
	| StdioClientTransport
	| WebSocketClientTransport
	| StreamableHTTPClientTransport;

/**
 * Factory for creating MCP client transports based on server configuration
 */
export class TransportFactory {
	/**
	 * Creates a transport instance for the given MCP server configuration
	 */
	static createTransport(server: MCPServer): ClientTransport {
		switch (server.transport) {
			case 'stdio':
				return this.createStdioTransport(server);

			case 'websocket':
				return this.createWebSocketTransport(server);

			case 'http':
				return this.createHTTPTransport(server);

			default: {
				const _exhaustiveCheck: never = server.transport;
				throw new Error(
					`Unsupported transport type: ${_exhaustiveCheck as string}`,
				);
			}
		}
	}

	/**
	 * Creates a stdio transport for local MCP servers
	 */
	private static createStdioTransport(server: MCPServer): StdioClientTransport {
		if (!server.command) {
			throw new Error(
				`MCP server "${server.name}" missing command for stdio transport`,
			);
		}

		return new StdioClientTransport({
			command: server.command,
			args: server.args || [],
			env: server.env
				? ({...process.env, ...server.env} as Record<string, string>)
				: undefined,
		});
	}

	/**
	 * Creates a WebSocket transport for remote MCP servers
	 */
	private static createWebSocketTransport(
		server: MCPServer,
	): WebSocketClientTransport {
		if (!server.url) {
			throw new Error(
				`MCP server "${server.name}" missing URL for websocket transport`,
			);
		}

		const url = new URL(server.url);

		// Validate WebSocket URL
		if (!url.protocol.startsWith('ws')) {
			throw new Error(
				`Invalid WebSocket URL protocol: ${url.protocol}. Expected ws:// or wss://`,
			);
		}

		const transport = new WebSocketClientTransport(url);

		// Note: The WebSocketClientTransport doesn't directly support headers in the current SDK
		// Authentication would need to be handled at the protocol level or via URL parameters
		if (server.auth) {
			console.warn(
				`WebSocket transport for server "${server.name}" has auth config, but current SDK doesn't support headers for WebSocket transport`,
			);
		}

		return transport;
	}

	/**
	 * Creates an HTTP transport for remote MCP servers
	 */
	private static createHTTPTransport(
		server: MCPServer,
	): StreamableHTTPClientTransport {
		if (!server.url) {
			throw new Error(
				`MCP server "${server.name}" missing URL for http transport`,
			);
		}

		const url = new URL(server.url);

		// Validate HTTP URL
		if (!url.protocol.startsWith('http')) {
			throw new Error(
				`Invalid HTTP URL protocol: ${url.protocol}. Expected http:// or https://`,
			);
		}

		// Note: The StreamableHTTPClientTransport doesn't directly support custom headers or auth in the current SDK
		// This would need to be handled via the MCP client or additional transport configuration
		const transport = new StreamableHTTPClientTransport(url, {
			requestInit: {
				headers: server.headers,
			},
		});

		if (server.auth) {
			console.warn(
				`HTTP transport for server "${server.name}" has auth config, but current SDK doesn't support custom headers for HTTP transport`,
			);
		}

		return transport;
	}

	/**
	 * Validates the server configuration for the given transport type
	 */
	static validateServerConfig(server: MCPServer): {
		valid: boolean;
		errors: string[];
	} {
		const errors: string[] = [];

		switch (server.transport) {
			case 'stdio':
				if (!server.command) {
					errors.push('stdio transport requires a command');
				}
				break;

			case 'websocket':
				if (!server.url) {
					errors.push('websocket transport requires a URL');
				} else {
					try {
						const url = new URL(server.url);
						if (!url.protocol.startsWith('ws')) {
							errors.push('websocket URL must use ws:// or wss:// protocol');
						}
					} catch {
						errors.push('websocket URL is invalid');
					}
				}
				break;

			case 'http':
				if (!server.url) {
					errors.push('http transport requires a URL');
				} else {
					try {
						const url = new URL(server.url);
						if (!url.protocol.startsWith('http')) {
							errors.push('http URL must use http:// or https:// protocol');
						}
					} catch {
						errors.push('http URL is invalid');
					}
				}
				break;
		}

		return {
			valid: errors.length === 0,
			errors,
		};
	}

	/**
	 * Gets transport-specific configuration tips for users
	 */
	static getTransportTips(transportType: MCPTransportType): string[] {
		switch (transportType) {
			case 'stdio':
				return [
					'Stdio transport spawns a local process',
					'Requires a command and optional arguments',
					'Environment variables can be passed to the process',
					'Best for local MCP servers and tools',
				];

			case 'websocket':
				return [
					'WebSocket transport connects to remote MCP servers',
					'Requires a ws:// or wss:// URL',
					'Supports real-time bidirectional communication',
					'Best for interactive remote services',
				];

			case 'http':
				return [
					'HTTP transport connects to remote MCP servers via REST API',
					'Requires an http:// or https:// URL',
					'Uses the StreamableHTTP protocol from MCP specification',
					'Best for stateless remote services and APIs',
				];

			default:
				return ['Unknown transport type'];
		}
	}
}
