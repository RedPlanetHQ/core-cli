/**
 * /tasks command
 * Displays current week's tasks in markdown format
 */

import React from 'react';
import type {Command} from '@/types/commands';
import type {Message} from '@/types/core';
import {TasksDisplay} from '@/components/tasks/tasks-display';
import {readWeekTasks, getWeekIdentifier, getCurrentWeekFilePath} from '@/utils/tasks';
import {TaskState} from '@/types/tasks';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';

export const tasksCommand: Command = {
	name: 'tasks',
	description: 'Display current week\'s tasks',
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
		// Get current week identifier
		const weekId = getWeekIdentifier();

		// Read tasks
		const tasks = await readWeekTasks();

		// Calculate counts
		const todoCount = tasks.filter(t => t.state === TaskState.TODO).length;
		const inProgressCount = tasks.filter(t => t.state === TaskState.IN_PROGRESS).length;
		const completedCount = tasks.filter(t => t.state === TaskState.COMPLETED).length;

		// Read raw markdown content
		const filePath = getCurrentWeekFilePath();
		let markdownContent = '';

		if (existsSync(filePath)) {
			markdownContent = await readFile(filePath, 'utf-8');
		} else {
			markdownContent = '## Todo\n\n## In Progress\n\n## Completed\n';
		}

		return React.createElement(TasksDisplay, {
			key: `tasks-${Date.now()}`,
			weekId,
			markdownContent,
			todoCount,
			inProgressCount,
			completedCount,
		});
	},
};
