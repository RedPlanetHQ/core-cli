#!/usr/bin/env node
import {render} from 'ink';
import App from '@/app';
import {findSession} from '@/utils/coding-sessions';
import {attachToSession, tmuxSessionExists} from '@/utils/tmux-manager';

// Parse CLI arguments
const args = process.argv.slice(2);

// Handle attach subcommand
if (args[0] === 'attach') {
	const sessionIdentifier = args[1];

	if (!sessionIdentifier) {
		console.error('❌ Please specify a session identifier');
		console.error('Usage: core-cli attach <task-number|session-name>');
		console.error('');
		console.error('Examples:');
		console.error('  core-cli attach task-42');
		console.error('  core-cli attach 42');
		console.error('  core-cli attach core-coding-task-42-a1b2');
		process.exit(1);
	}

	// Find the session
	const session = findSession(sessionIdentifier);

	if (!session) {
		console.error(`❌ Session not found: ${sessionIdentifier}`);
		console.error('');
		console.error('Run "core-cli" and use /sessions to see active sessions');
		process.exit(1);
	}

	// Check if tmux session exists
	if (!tmuxSessionExists(session.tmuxSessionName)) {
		console.error(`❌ Tmux session does not exist: ${session.tmuxSessionName}`);
		console.error('The session may have been closed.');
		process.exit(1);
	}

	// Attach to the session
	try {
		attachToSession(session.tmuxSessionName);
		process.exit(0);
	} catch (error) {
		console.error(
			`❌ Failed to attach: ${
				error instanceof Error ? error.message : 'Unknown error'
			}`,
		);
		process.exit(1);
	}
}

// Otherwise launch normal core-cli app
render(<App />);
