import React from 'react';
import type {Message} from './core';
import type {UpdateInfo} from './utils';

export interface MessageSubmissionOptions {
	onClearMessages: () => Promise<void>;
	onEnterModelSelectionMode: () => void;
	onEnterProviderSelectionMode: () => void;
	onEnterThemeSelectionMode: () => void;
	onEnterNameSelectionMode: () => void;
	onEnterCodingAgentSelectionMode: () => void;
	onEnterRecommendationsMode: () => void;
	onEnterConfigWizardMode: () => void;
	onShowStatus: () => void;
	onToggleIncognitoMode: () => void;
	onHandleChatMessage: (message: string) => Promise<void>;
	onAddToChatQueue: (component: React.ReactNode) => void;
	componentKeyCounter: number;
	setMessages: (messages: Message[]) => void;
	messages: Message[];
	setIsBashExecuting: (executing: boolean) => void;
	setCurrentBashCommand: (command: string) => void;
	provider: string;
	model: string;
	theme: string;
	updateInfo: UpdateInfo | null;
	getMessageTokens: (message: Message) => number;
	isIncognitoMode: boolean;
}
