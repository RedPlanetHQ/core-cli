import React from 'react';

import {tool, jsonSchema, type Tool as AISDKTool} from 'ai';

export {tool, jsonSchema};

// Type for AI SDK tools (return type of tool() function)
// Tool<PARAMETERS, RESULT> is AI SDK's actual tool type
// We use 'any' for generics since we don't auto-execute tools (human-in-the-loop)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AISDKCoreTool = AISDKTool<any, any>;

// Current Core message format (OpenAI-compatible)
// Note: We maintain this format internally and convert to ModelMessage at AI SDK boundary
export interface Message {
	role: 'user' | 'assistant' | 'system' | 'tool';
	content: string;
	tool_calls?: ToolCall[];
	tool_call_id?: string;
	name?: string;
}

export interface ToolCall {
	id: string;
	function: {
		name: string;
		arguments: Record<string, unknown>;
	};
}

export interface ToolResult {
	tool_call_id: string;
	role: 'tool';
	name: string;
	content: string;
}

export interface ToolParameterSchema {
	type?: string;
	description?: string;
	[key: string]: unknown;
}

export interface Tool {
	type: 'function';
	function: {
		name: string;
		description: string;
		parameters: {
			type: 'object';
			properties: Record<string, ToolParameterSchema>;
			required: string[];
		};
	};
}

// Tool handlers accept dynamic args from LLM, so any is appropriate here
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments are dynamically typed
export type ToolHandler = (input: any) => Promise<string>;

/**
 * Tool formatter type for Ink UI
 * Formats tool arguments and results for display in the CLI
 */
export type ToolFormatter = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments are dynamically typed
	args: any,
	result?: string,
) =>
	| string
	| Promise<string>
	| React.ReactElement
	| Promise<React.ReactElement>;

/**
 * Tool validator type for pre-execution validation
 * Returns validation result with optional error message
 */
export type ToolValidator = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments are dynamically typed
	args: any,
) => Promise<{valid: true} | {valid: false; error: string}>;

/**
 * Unified tool entry interface
 *
 * Provides a structured way to manage all tool metadata in one place:
 * - name: Tool name for registry and lookup
 * - tool: Native AI SDK CoreTool (without execute for human-in-the-loop)
 * - handler: Manual execution handler called after user confirmation
 * - formatter: Optional React component for rich CLI UI display
 * - validator: Optional pre-execution validation function
 */
export interface ToolEntry {
	name: string;
	tool: AISDKCoreTool; // For AI SDK
	handler: ToolHandler; // For execution
	formatter?: ToolFormatter; // For UI (React component)
	validator?: ToolValidator; // For validation
}

/**
 * Core's extended tool definition
 *
 * Uses AI SDK's native CoreTool with Core-specific metadata:
 * - name: Tool name (metadata for registry and lookup)
 * - tool: Native AI SDK CoreTool (using tool() and jsonSchema()) WITHOUT execute function
 * - handler: Manual execution function called after user confirmation (human-in-the-loop)
 * - formatter: React component for rich UI display in terminal
 * - validator: Optional pre-execution validation
 * - requiresConfirmation: Whether to show confirmation UI (default: true)
 *
 * Note: We keep 'name' as metadata since AI SDK's Tool type doesn't expose it.
 */
export interface ToolDefinition {
	// Tool name for registry and lookup
	name: string;
	// Native AI SDK tool (without execute to prevent auto-execution)
	tool: AISDKCoreTool;
	// Manual execution handler (called after user confirmation)
	handler: ToolHandler;
	formatter?: (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments are dynamically typed
		args: any,
		result?: string,
	) =>
		| string
		| Promise<string>
		| React.ReactElement
		| Promise<React.ReactElement>;
	requiresConfirmation?: boolean;
	validator?: (
		// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments are dynamically typed
		args: any,
	) => Promise<{valid: true} | {valid: false; error: string}>;
	// Use def.tool.name instead of def.config.function.name
	config?: Tool;
}

interface LLMMessage {
	role: 'assistant';
	content: string;
	tool_calls?: ToolCall[];
}

export interface LLMChatResponse {
	choices: Array<{
		message: LLMMessage;
	}>;
}

export interface StreamCallbacks {
	onToken?: (token: string) => void;
	onToolCall?: (toolCall: ToolCall) => void;
	onFinish?: () => void;
}

export interface LLMClient {
	getCurrentModel(): string;
	setModel(model: string): void;
	getContextSize(): number;
	getAvailableModels(): Promise<string[]>;
	chat(
		messages: Message[],
		tools: Record<string, AISDKCoreTool>,
		signal?: AbortSignal,
	): Promise<LLMChatResponse>;
	chatStream?(
		messages: Message[],
		tools: Record<string, AISDKCoreTool>,
		callbacks: StreamCallbacks,
		signal?: AbortSignal,
	): Promise<LLMChatResponse>;
	clearContext(): Promise<void>;
}

export type DevelopmentMode = 'normal' | 'auto-accept';

export const DEVELOPMENT_MODE_LABELS: Record<DevelopmentMode, string> = {
	normal: '▶ normal mode on',
	'auto-accept': '⏵⏵ auto-accept mode on',
};
