/**
 * /incognito command
 * Toggles incognito mode to prevent saving episodes
 */

import React from 'react';
import type {Command} from '@/types/commands';
import type {Message} from '@/types/core';
import {Text, Box} from 'ink';

export const incognitoCommand: Command = {
	name: 'incognito',
	description: 'Toggle incognito mode (prevents saving episodes)',
	handler: async (
		_args: string[],
		_messages: Message[],
		_metadata: {
			provider: string;
			model: string;
			tokens: number;
			getMessageTokens: (message: Message) => number;
		},
	) => {
		// The actual state toggling will be handled in appUtils.ts
		// This just returns a confirmation message
		return React.createElement(
			Box,
			{flexDirection: 'column', paddingY: 1},
			React.createElement(
				Text,
				{color: 'gray'},
				'Incognito mode toggled. Episodes will not be saved when incognito mode is active.',
			),
		);
	},
};
