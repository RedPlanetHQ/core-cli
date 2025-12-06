/**
 * /set-coding-agent command
 * Change the default coding agent
 */

import React from 'react';
import type {Command} from '@/types/commands';

export const setCodingAgentCommand: Command = {
	name: 'set-coding-agent',
	description: 'Change the default coding agent',
	handler: (_args: string[], _messages, _metadata) => {
		// This command is handled specially in app.tsx
		// This handler exists only for registration purposes
		return Promise.resolve(React.createElement(React.Fragment));
	},
};
