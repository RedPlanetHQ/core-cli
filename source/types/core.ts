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
	// Store original content before routine replacement (for episode saving)
	_originalContent?: string;
}

export interface ToolCall {
	id: string;
	function: {
		name: string;
		arguments: Record<string, unknown>;
	};
	// Optional: ID of parent tool call (for nested subagent calls)
	parentToolCallId?: string;
}

export interface ToolResult {
	tool_call_id: string;
	role: 'tool';
	name: string;
	content: string;
	// Optional: ID of parent tool call (for nested subagent calls)
	parentToolCallId?: string;
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
export type ToolHandler = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Tool arguments are dynamically typed
	input: any,
	options?: ToolExecutionOptions,
) => Promise<string>;

/**
 * Options passed to tool execution handlers
 * Allows tools to report progress during execution
 */
export interface ToolExecutionOptions {
	/**
	 * Callback for reporting progress during tool execution
	 * Allows tools to emit intermediate updates that can be displayed to the user
	 */
	onProgress?: (update: ToolProgressUpdate) => void;
	/**
	 * Unique identifier for this tool execution
	 * Used to correlate progress updates with the correct UI component
	 */
	toolCallId?: string;
}

/**
 * Progress update emitted by a tool during execution
 */
export interface ToolProgressUpdate {
	/** Type of update */
	type: 'tool_call' | 'tool_result' | 'status' | 'custom';
	/** Update message or data */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	data: Record<string, any>;
	/** Optional timestamp */
	timestamp?: number;
}

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
 * - progressFormatter: Optional formatter for displaying progressive updates
 */
export interface ToolEntry {
	name: string;
	tool: AISDKCoreTool; // For AI SDK
	handler: ToolHandler; // For execution
	formatter?: ToolFormatter; // For UI (React component)
	validator?: ToolValidator; // For validation
	progressFormatter?: ProgressFormatter; // For progressive updates
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
	onToolExecuted?: (toolCall: ToolCall, result: string) => void;
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

/**
 * Progress formatter type for displaying tool execution progress
 * Called multiple times as progress updates arrive
 */
export type ProgressFormatter = (
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	args: any,
	updates: ToolProgressUpdate[],
) => React.ReactElement | Promise<React.ReactElement>;

/**
 * This is what individual tool files export (e.g., read-file.tsx, execute-bash.tsx).
 * The handler is extracted from tool.execute() in tools/index.ts to avoid duplication.
 *
 * Structure:
 * - name: Tool name as const for type safety
 * - tool: Native AI SDK v6 CoreTool with execute() function
 * - formatter: Optional React component for rich CLI UI display
 * - validator: Optional pre-execution validation function
 * - progressFormatter: Optional formatter for displaying progressive updates during execution
 */
export interface CoreToolExport {
	name: string;
	tool: AISDKCoreTool; // AI SDK v6 tool with execute()
	formatter?: ToolFormatter; // For UI display
	validator?: ToolValidator; // For pre-execution validation
	progressFormatter?: ProgressFormatter; // For progressive display
}
