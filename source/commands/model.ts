import React from 'react';
import {Command} from '@/types/index';

export const modelCommand: Command = {
	name: 'model',
	description: 'Select a model for the current provider',
	handler: (_args: string[], _messages, _metadata) => {
		// This command is handled specially in app.tsx
		// This handler exists only for registration purposes
		return Promise.resolve(React.createElement(React.Fragment));
	},
};
