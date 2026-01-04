import {ReactNode} from 'react';

export interface AssistantMessageProps {
	message: string;
	model: string;
}

export interface BashExecutionIndicatorProps {
	command: string;
}

export interface ChatQueueProps {
	staticComponents?: ReactNode[];
	queuedComponents?: ReactNode[];
}

export type Completion = {name: string; isCustom: boolean};

export interface ToolExecutionIndicatorProps {
	toolName: string;
	currentIndex: number;
	totalTools: number;
	toolArgs?: any;
	toolManager?: any; // ToolManager type - using any to avoid circular dependency
}

export interface UserMessageProps {
	message: string;
}
