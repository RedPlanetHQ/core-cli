import type {Command, Message} from '@/types/index';
import React from 'react';
import ErrorMessage from '@/components/error-message';
import {fuzzyScore} from '@/utils/fuzzy-matching';

class CommandRegistry {
	private commands = new Map<string, Command>();

	register(command: Command | Command[]): void {
		if (Array.isArray(command)) {
			command.forEach(cmd => this.register(cmd));
			return;
		}
		this.commands.set(command.name, command);
	}

	get(name: string): Command | undefined {
		return this.commands.get(name);
	}

	getAll(): Command[] {
		return Array.from(this.commands.values());
	}

	getCompletions(prefix: string): string[] {
		// Use fuzzy matching with scoring
		const scoredCommands = Array.from(this.commands.keys())
			.map(name => ({
				name,
				score: fuzzyScore(name, prefix),
			}))
			.filter(cmd => cmd.score > 0) // Only include matches
			.sort((a, b) => {
				// Sort by score (descending)
				if (b.score !== a.score) {
					return b.score - a.score;
				}
				// If scores are equal, sort alphabetically
				return a.name.localeCompare(b.name);
			});

		return scoredCommands.map(cmd => cmd.name);
	}

	async execute(
		input: string,
		messages: Message[],
		metadata: {
			provider: string;
			model: string;
			tokens: number;
			getMessageTokens: (message: Message) => number;
		},
	): Promise<void | string | React.ReactNode> {
		const parts = input.trim().split(/\s+/);
		const commandName = parts[0];
		if (!commandName) {
			return React.createElement(ErrorMessage, {
				key: `error-${Date.now()}`,
				message: 'Invalid command. Type /help for available commands.',
				hideBox: true,
			});
		}

		const args = parts.slice(1);

		const command = this.get(commandName);
		if (!command) {
			return React.createElement(ErrorMessage, {
				key: `error-${Date.now()}`,
				message: `Unknown command: ${commandName}. Type /help for available commands.`,
				hideBox: true,
			});
		}

		return await command.handler(args, messages, metadata);
	}
}

export const commandRegistry = new CommandRegistry();
