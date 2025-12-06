/* eslint-disable @typescript-eslint/require-await */
import {tool, jsonSchema} from '@/types/core';
import type {ToolDefinition} from '@/types/index';
import {
	readWeekTasks,
	writeWeekTasks,
	getNextTaskNumber,
	getAllWeekFiles,
	readTasksFromWeekFile,
	getCurrentWeekFile,
	syncTasksToCore,
} from '@/utils/tasks';
import type {Task, Priority} from '@/types/tasks';
import {TaskState} from '@/types/tasks';
import {updateLastTaskSync} from '@/config/index';

// Helper function to sync tasks to Core API after modifications
async function syncTasksToMemory(): Promise<void> {
	try {
		// Sync to Core API
		await syncTasksToCore();

		// Update last sync timestamp
		const now = new Date().toISOString();
		updateLastTaskSync(now);
	} catch (error) {
		// Silent failure - don't block tool execution if sync fails
		console.warn('Failed to sync tasks to Core:', error);
	}
}

// ==================== NEW TASK ====================

const newTaskCoreTool = tool({
	description: 'Create a new task in the current week',
	inputSchema: jsonSchema<{
		description: string;
		tags?: string[];
		priority?: Priority;
	}>({
		type: 'object',
		properties: {
			description: {
				type: 'string',
				description: 'The task description',
			},
			tags: {
				type: 'array',
				items: {type: 'string'},
				description: 'Optional tags for the task (without # prefix)',
			},
			priority: {
				type: 'string',
				enum: ['high', 'medium', 'low'],
				description: 'Optional priority level',
			},
		},
		required: ['description'],
	}),
});

const executeNewTask = async (args: {
	description: string;
	tags?: string[];
	priority?: Priority;
}): Promise<string> => {
	const tasks = await readWeekTasks();
	const taskNumber = getNextTaskNumber(tasks);

	const newTask: Task = {
		number: taskNumber,
		description: args.description,
		state: TaskState.TODO,
		tags: args.tags || [],
		priority: args.priority,
	};

	tasks.push(newTask);
	await writeWeekTasks(tasks);

	// Sync to memory
	await syncTasksToMemory();

	return `Task #${taskNumber} created successfully in ${getCurrentWeekFile()}`;
};

const newTaskFormatter = async (
	args: {description: string; tags?: string[]; priority?: Priority},
	result?: string,
): Promise<string> => {
	const lines: string[] = ['⚒ new_task'];
	lines.push(`└ Description: ${args.description}`);

	if (args.tags && args.tags.length > 0) {
		lines.push(`  Tags: ${args.tags.map(t => `#${t}`).join(' ')}`);
	}

	if (args.priority) {
		lines.push(`  Priority: #${args.priority}`);
	}

	if (result) {
		lines.push(`  ${result}`);
	}

	return lines.join('\n');
};

const newTaskValidator = async (args: {
	description: string;
	tags?: string[];
	priority?: Priority;
}): Promise<{valid: true} | {valid: false; error: string}> => {
	if (!args.description || args.description.trim().length === 0) {
		return {valid: false, error: '⚒ Task description cannot be empty'};
	}

	if (args.priority) {
		if (!['high', 'medium', 'low'].includes(args.priority)) {
			return {
				valid: false,
				error: '⚒ Priority must be one of: high, medium, low',
			};
		}
	}

	return {valid: true};
};

export const newTaskTool: ToolDefinition = {
	name: 'new_task',
	tool: newTaskCoreTool,
	handler: executeNewTask,
	formatter: newTaskFormatter,
	validator: newTaskValidator,
};

// ==================== UPDATE TASK ====================

const updateTaskCoreTool = tool({
	description:
		'Update an existing task (change state, description, tags, or priority)',
	inputSchema: jsonSchema<{
		taskNumber: number;
		state?: TaskState;
		description?: string;
		tags?: string[];
		priority?: Priority | null;
	}>({
		type: 'object',
		properties: {
			taskNumber: {
				type: 'number',
				description: 'The task number to update',
			},
			state: {
				type: 'string',
				enum: ['todo', 'in_progress', 'completed'],
				description: 'New state for the task',
			},
			description: {
				type: 'string',
				description: 'New description for the task',
			},
			tags: {
				type: 'array',
				items: {type: 'string'},
				description: 'New tags (replaces existing tags)',
			},
			priority: {
				type: ['string', 'null'],
				enum: ['high', 'medium', 'low', null],
				description: 'New priority (use null to remove priority)',
			},
		},
		required: ['taskNumber'],
	}),
});

const executeUpdateTask = async (args: {
	taskNumber: number;
	state?: TaskState;
	description?: string;
	tags?: string[];
	priority?: Priority | null;
}): Promise<string> => {
	const tasks = await readWeekTasks();
	const taskIndex = tasks.findIndex(t => t.number === args.taskNumber);

	if (taskIndex === -1) {
		throw new Error(`Task #${args.taskNumber} not found`);
	}

	const task = tasks[taskIndex];
	const updates: string[] = [];

	// Update state
	if (args.state !== undefined) {
		task.state = args.state;
		updates.push(`state → ${args.state}`);

		// Set completion date if moving to completed
		if (args.state === TaskState.COMPLETED) {
			task.completedAt = new Date().toISOString().split('T')[0];
		} else {
			task.completedAt = undefined;
		}
	}

	// Update description
	if (args.description !== undefined) {
		task.description = args.description;
		updates.push('description updated');
	}

	// Update tags
	if (args.tags !== undefined) {
		task.tags = args.tags;
		updates.push(`tags → ${args.tags.map(t => `#${t}`).join(' ') || 'none'}`);
	}

	// Update priority
	if (args.priority !== undefined) {
		task.priority = args.priority || undefined;
		updates.push(`priority → ${args.priority ? `#${args.priority}` : 'none'}`);
	}

	await writeWeekTasks(tasks);

	// Sync to memory
	await syncTasksToMemory();

	return `Task #${args.taskNumber} updated: ${updates.join(', ')}`;
};

const updateTaskFormatter = async (
	args: {
		taskNumber: number;
		state?: TaskState;
		description?: string;
		tags?: string[];
		priority?: Priority | null;
	},
	result?: string,
): Promise<string> => {
	const lines: string[] = ['⚒ update_task'];
	lines.push(`└ Task Number: #${args.taskNumber}`);

	if (args.state) {
		lines.push(`  New State: ${args.state}`);
	}

	if (args.description) {
		lines.push(`  New Description: ${args.description}`);
	}

	if (args.tags !== undefined) {
		const tagsStr =
			args.tags.length > 0 ? args.tags.map(t => `#${t}`).join(' ') : 'none';
		lines.push(`  New Tags: ${tagsStr}`);
	}

	if (args.priority !== undefined) {
		const priorityStr = args.priority ? `#${args.priority}` : 'none';
		lines.push(`  New Priority: ${priorityStr}`);
	}

	if (result) {
		lines.push(`  ${result}`);
	}

	return lines.join('\n');
};

const updateTaskValidator = async (args: {
	taskNumber: number;
	state?: TaskState;
	description?: string;
	tags?: string[];
	priority?: Priority | null;
}): Promise<{valid: true} | {valid: false; error: string}> => {
	if (args.taskNumber < 1) {
		return {valid: false, error: '⚒ Task number must be positive'};
	}

	if (
		args.state &&
		!['todo', 'in_progress', 'completed'].includes(args.state)
	) {
		return {
			valid: false,
			error: '⚒ State must be one of: todo, in_progress, completed',
		};
	}

	if (
		args.priority !== undefined &&
		args.priority !== null &&
		!['high', 'medium', 'low'].includes(args.priority)
	) {
		return {
			valid: false,
			error: '⚒ Priority must be one of: high, medium, low, or null',
		};
	}

	if (
		args.description === undefined &&
		args.state === undefined &&
		args.tags === undefined &&
		args.priority === undefined
	) {
		return {
			valid: false,
			error:
				'⚒ At least one field must be provided (state, description, tags, or priority)',
		};
	}

	return {valid: true};
};

export const updateTaskTool: ToolDefinition = {
	name: 'update_task',
	tool: updateTaskCoreTool,
	handler: executeUpdateTask,
	formatter: updateTaskFormatter,
	validator: updateTaskValidator,
};

// ==================== DELETE TASK ====================

const deleteTaskCoreTool = tool({
	description: 'Delete a task by its number',
	inputSchema: jsonSchema<{taskNumber: number}>({
		type: 'object',
		properties: {
			taskNumber: {
				type: 'number',
				description: 'The task number to delete',
			},
		},
		required: ['taskNumber'],
	}),
});

const executeDeleteTask = async (args: {
	taskNumber: number;
}): Promise<string> => {
	const tasks = await readWeekTasks();
	const taskIndex = tasks.findIndex(t => t.number === args.taskNumber);

	if (taskIndex === -1) {
		throw new Error(`Task #${args.taskNumber} not found`);
	}

	const deletedTask = tasks[taskIndex];
	tasks.splice(taskIndex, 1);

	await writeWeekTasks(tasks);

	// Sync to memory
	await syncTasksToMemory();

	return `Task #${args.taskNumber} "${deletedTask.description}" deleted successfully.`;
};

const deleteTaskFormatter = async (
	args: {taskNumber: number},
	result?: string,
): Promise<string> => {
	const lines: string[] = ['⚒ delete_task'];
	lines.push(`└ Task Number: #${args.taskNumber}`);

	if (result) {
		lines.push(`  ${result}`);
	}

	return lines.join('\n');
};

const deleteTaskValidator = async (args: {
	taskNumber: number;
}): Promise<{valid: true} | {valid: false; error: string}> => {
	if (args.taskNumber < 1) {
		return {valid: false, error: '⚒ Task number must be positive'};
	}

	const tasks = await readWeekTasks();
	const taskExists = tasks.some(t => t.number === args.taskNumber);

	if (!taskExists) {
		return {
			valid: false,
			error: `⚒ Task #${args.taskNumber} not found in current week`,
		};
	}

	return {valid: true};
};

export const deleteTaskTool: ToolDefinition = {
	name: 'delete_task',
	tool: deleteTaskCoreTool,
	handler: executeDeleteTask,
	formatter: deleteTaskFormatter,
	validator: deleteTaskValidator,
};

// ==================== LIST TASKS ====================

const listTasksCoreTool = tool({
	description:
		'List all tasks from the current week, optionally filtered by state',
	inputSchema: jsonSchema<{state?: TaskState}>({
		type: 'object',
		properties: {
			state: {
				type: 'string',
				enum: ['todo', 'in_progress', 'completed'],
				description: 'Optional: filter tasks by state',
			},
		},
	}),
});

const executeListTasks = async (args: {state?: TaskState}): Promise<string> => {
	const tasks = await readWeekTasks();

	if (tasks.length === 0) {
		return 'No tasks found for the current week';
	}

	const filteredTasks = args.state
		? tasks.filter(t => t.state === args.state)
		: tasks;

	if (filteredTasks.length === 0) {
		return `No tasks found with state "${args.state}"`;
	}

	const lines: string[] = [];
	lines.push(`Tasks from ${getCurrentWeekFile()}:`);
	lines.push('');

	// Group by state if not filtering
	if (!args.state) {
		const todoTasks = tasks.filter(t => t.state === TaskState.TODO);
		const inProgressTasks = tasks.filter(
			t => t.state === TaskState.IN_PROGRESS,
		);
		const completedTasks = tasks.filter(t => t.state === TaskState.COMPLETED);

		if (todoTasks.length > 0) {
			lines.push('## Todo');
			for (const task of todoTasks) {
				lines.push(formatTaskForDisplay(task));
			}
			lines.push('');
		}

		if (inProgressTasks.length > 0) {
			lines.push('## In Progress');
			for (const task of inProgressTasks) {
				lines.push(formatTaskForDisplay(task));
			}
			lines.push('');
		}

		if (completedTasks.length > 0) {
			lines.push('## Completed');
			for (const task of completedTasks) {
				lines.push(formatTaskForDisplay(task));
			}
		}
	} else {
		// Just list filtered tasks
		for (const task of filteredTasks) {
			lines.push(formatTaskForDisplay(task));
		}
	}

	return lines.join('\n');
};

function formatTaskForDisplay(task: Task): string {
	let line = `${task.number}. ${task.description}`;

	if (task.tags.length > 0) {
		line += ` ${task.tags.map(t => `#${t}`).join(' ')}`;
	}

	if (task.priority) {
		line += ` #${task.priority}`;
	}

	if (task.completedAt) {
		line += ` (${task.completedAt})`;
	}

	return line;
}

const listTasksFormatter = async (
	args: {state?: TaskState},
	result?: string,
): Promise<string> => {
	const lines: string[] = ['⚒ list_tasks'];

	if (args.state) {
		lines.push(`└ Filter: ${args.state}`);
		if (result) {
			lines.push(`  ${result}`);
		}
	} else {
		if (result) {
			lines.push(`└ ${result}`);
		}
	}

	return lines.join('\n');
};

export const listTasksTool: ToolDefinition = {
	name: 'list_tasks',
	tool: listTasksCoreTool,
	handler: executeListTasks,
	formatter: listTasksFormatter,
};

// ==================== SEARCH TASKS ====================

const searchTasksCoreTool = tool({
	description:
		'Search for tasks across all weeks by description, tags, or state',
	inputSchema: jsonSchema<{query: string; state?: TaskState}>({
		type: 'object',
		properties: {
			query: {
				type: 'string',
				description: 'Search query (searches in description and tags)',
			},
			state: {
				type: 'string',
				enum: ['todo', 'in_progress', 'completed'],
				description: 'Optional: filter results by state',
			},
		},
		required: ['query'],
	}),
});

const executeSearchTasks = async (args: {
	query: string;
	state?: TaskState;
}): Promise<string> => {
	const weekFiles = await getAllWeekFiles();

	if (weekFiles.length === 0) {
		return 'No task files found';
	}

	const searchQuery = args.query.toLowerCase();
	const results: Array<{weekFile: string; task: Task}> = [];

	// Search across all week files
	for (const weekFile of weekFiles) {
		const {tasks} = await readTasksFromWeekFile(weekFile);

		for (const task of tasks) {
			// Filter by state if provided
			if (args.state && task.state !== args.state) {
				continue;
			}

			// Search in description and tags
			const descriptionMatch = task.description
				.toLowerCase()
				.includes(searchQuery);
			const tagMatch = task.tags.some(tag =>
				tag.toLowerCase().includes(searchQuery),
			);

			if (descriptionMatch || tagMatch) {
				results.push({weekFile, task});
			}
		}
	}

	if (results.length === 0) {
		return `No tasks found matching "${args.query}"`;
	}

	const lines: string[] = [];
	lines.push(`Found ${results.length} task(s) matching "${args.query}":`);
	lines.push('');

	// Group by week file
	let currentWeekFile = '';
	for (const {weekFile, task} of results) {
		if (weekFile !== currentWeekFile) {
			if (currentWeekFile !== '') {
				lines.push('');
			}
			lines.push(`## ${weekFile}`);
			currentWeekFile = weekFile;
		}

		lines.push(`  ${formatTaskForDisplay(task)} [${task.state}]`);
	}

	return lines.join('\n');
};

const searchTasksFormatter = async (
	args: {query: string; state?: TaskState},
	result?: string,
): Promise<string> => {
	const lines: string[] = ['⚒ search_tasks'];
	lines.push(`└ Query: ${args.query}`);

	if (args.state) {
		lines.push(`  Filter: ${args.state}`);
	}

	if (result) {
		lines.push(`  ${result}`);
	}

	return lines.join('\n');
};

const searchTasksValidator = async (args: {
	query: string;
	state?: TaskState;
}): Promise<{valid: true} | {valid: false; error: string}> => {
	if (!args.query || args.query.trim().length === 0) {
		return {valid: false, error: '⚒ Search query cannot be empty'};
	}

	return {valid: true};
};

export const searchTasksTool: ToolDefinition = {
	name: 'search_tasks',
	tool: searchTasksCoreTool,
	handler: executeSearchTasks,
	formatter: searchTasksFormatter,
	validator: searchTasksValidator,
};
