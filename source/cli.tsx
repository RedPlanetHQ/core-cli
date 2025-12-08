#!/usr/bin/env node
import React from 'react';
import {render} from 'ink';
import App from '@/app';
import {
	handleSessionsCommand,
	handleSessionsAttach,
} from './main_commands/sessions';
import {handleTasksCommand} from './main_commands/tasks';

// Parse CLI arguments
const args = process.argv.slice(2);
const command = args[0];
const subcommand = args[1];

// Handle sessions command (with shortcut 's')
if (command === 'sessions' || command === 's') {
	handleSessionsCommand(subcommand, args[2]);
} else if (command === 'tasks' || command === 't') {
	// Handle tasks command (with shortcut 't')
	void handleTasksCommand(subcommand, args.slice(2));
} else if (command === 'attach') {
	// Handle legacy attach subcommand (backwards compatibility)
	handleSessionsAttach(args[1]);
} else {
	// Otherwise launch normal core-cli app
	render(<App />);
}
