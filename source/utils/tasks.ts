import {join} from 'node:path';
import {readFile, writeFile, mkdir, readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {getAppDataPath} from '@/config/paths';
import type {Task, TaskState, Priority, WeekTasks} from '@/types/tasks';
import {TaskState as TaskStateEnum} from '@/types/tasks';
import {appConfig} from '@/config/index';

/**
 * Get the tasks directory path (platform-specific)
 */
export function getTasksDir(): string {
	return join(getAppDataPath(), 'tasks');
}

/**
 * Get ISO week number for a date
 * Returns format: YYYY-WNN (e.g., "2025-W48")
 */
export function getWeekIdentifier(date: Date = new Date()): string {
	// Copy date to avoid mutation
	const d = new Date(date);

	// Set to nearest Thursday: current date + 4 - current day number
	// Make Sunday's day number 7
	d.setDate(d.getDate() + 4 - (d.getDay() || 7));

	// Get first day of year
	const yearStart = new Date(d.getFullYear(), 0, 1);

	// Calculate full weeks to nearest Thursday
	const weekNumber = Math.ceil(
		((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
	);

	// Return format: YYYY-WNN
	return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

/**
 * Get the filename for current week
 */
export function getCurrentWeekFile(): string {
	return `${getWeekIdentifier()}.md`;
}

/**
 * Get the full path for current week's task file
 */
export function getCurrentWeekFilePath(): string {
	return join(getTasksDir(), getCurrentWeekFile());
}

/**
 * Parse a task line from markdown
 * Format: - [x] 1. Task description #tag1 #tag2 #high (2025-11-26)
 */
function parseTaskLine(line: string, state: TaskState): Task | null {
	// Match pattern: - [marker] number. description tags (date)
	const match = line.match(/^-\s+\[.\]\s+(\d+)\.\s+(.+?)(?:\s+\(([^)]+)\))?$/);

	if (!match) {
		return null;
	}

	const [, numberStr, contentWithTags, completedAt] = match;
	const number = parseInt(numberStr, 10);

	// Extract tags and priority from content
	const tags: string[] = [];
	let priority: Priority | undefined;

	// Extract all #hashtags
	const tagMatches = contentWithTags.matchAll(/#(\w+)/g);
	for (const tagMatch of tagMatches) {
		const tag = tagMatch[1];

		// Check if it's a priority tag
		if (tag === 'high' || tag === 'medium' || tag === 'low') {
			priority = tag as Priority;
		} else {
			tags.push(tag);
		}
	}

	// Remove tags from description
	const description = contentWithTags.replace(/#\w+/g, '').trim();

	return {
		number,
		description,
		state,
		tags,
		priority,
		completedAt: completedAt || undefined,
	};
}

/**
 * Parse markdown content into tasks
 */
export function parseTasksFromMarkdown(markdown: string): Task[] {
	const tasks: Task[] = [];
	const lines = markdown.split('\n');

	let currentState: TaskState | null = null;

	for (const line of lines) {
		const trimmed = line.trim();

		// Check for section headers
		if (trimmed === '## Todo') {
			currentState = TaskStateEnum.TODO;
			continue;
		} else if (trimmed === '## In Progress') {
			currentState = TaskStateEnum.IN_PROGRESS;
			continue;
		} else if (trimmed === '## Completed') {
			currentState = TaskStateEnum.COMPLETED;
			continue;
		}

		// Parse task line if we're in a section
		if (currentState !== null && trimmed.startsWith('-')) {
			const task = parseTaskLine(trimmed, currentState);
			if (task) {
				tasks.push(task);
			}
		}
	}

	return tasks;
}

/**
 * Format a single task as markdown
 */
function formatTaskLine(task: Task): string {
	// State marker
	let marker = ' ';
	if (task.state === TaskStateEnum.TODO) {
		marker = ' ';
	} else if (task.state === TaskStateEnum.IN_PROGRESS) {
		marker = '>';
	} else if (task.state === TaskStateEnum.COMPLETED) {
		marker = 'x';
	}

	// Build description with tags
	let line = `- [${marker}] ${task.number}. ${task.description}`;

	// Add tags
	for (const tag of task.tags) {
		line += ` #${tag}`;
	}

	// Add priority if present
	if (task.priority) {
		line += ` #${task.priority}`;
	}

	// Add completion date for completed tasks
	if (task.state === TaskStateEnum.COMPLETED && task.completedAt) {
		line += ` (${task.completedAt})`;
	}

	return line;
}

/**
 * Write tasks to markdown format
 */
export function writeTasksToMarkdown(tasks: Task[]): string {
	const lines: string[] = [];

	// Group tasks by state
	const todoTasks = tasks.filter(t => t.state === TaskStateEnum.TODO);
	const inProgressTasks = tasks.filter(
		t => t.state === TaskStateEnum.IN_PROGRESS,
	);
	const completedTasks = tasks.filter(t => t.state === TaskStateEnum.COMPLETED);

	// Todo section
	lines.push('## Todo');
	if (todoTasks.length === 0) {
		lines.push('');
	} else {
		for (const task of todoTasks) {
			lines.push(formatTaskLine(task));
		}
	}

	lines.push('');

	// In Progress section
	lines.push('## In Progress');
	if (inProgressTasks.length === 0) {
		lines.push('');
	} else {
		for (const task of inProgressTasks) {
			lines.push(formatTaskLine(task));
		}
	}

	lines.push('');

	// Completed section
	lines.push('## Completed');
	if (completedTasks.length === 0) {
		lines.push('');
	} else {
		for (const task of completedTasks) {
			lines.push(formatTaskLine(task));
		}
	}

	return lines.join('\n') + '\n';
}

/**
 * Read tasks from current week's file
 */
export async function readWeekTasks(): Promise<Task[]> {
	const filePath = getCurrentWeekFilePath();

	// Ensure directory exists
	const tasksDir = getTasksDir();
	if (!existsSync(tasksDir)) {
		await mkdir(tasksDir, {recursive: true});
	}

	// If file doesn't exist, return empty array
	if (!existsSync(filePath)) {
		return [];
	}

	const content = await readFile(filePath, 'utf-8');
	return parseTasksFromMarkdown(content);
}

/**
 * Write tasks to current week's file
 */
export async function writeWeekTasks(tasks: Task[]): Promise<void> {
	const filePath = getCurrentWeekFilePath();
	const tasksDir = getTasksDir();

	// Ensure directory exists
	if (!existsSync(tasksDir)) {
		await mkdir(tasksDir, {recursive: true});
	}

	const markdown = writeTasksToMarkdown(tasks);
	await writeFile(filePath, markdown, 'utf-8');
}

/**
 * Get all week files in the tasks directory
 * Returns sorted array of filenames (e.g., ["2025-W47.md", "2025-W48.md"])
 */
export async function getAllWeekFiles(): Promise<string[]> {
	const tasksDir = getTasksDir();

	if (!existsSync(tasksDir)) {
		return [];
	}

	const files = await readdir(tasksDir);

	// Filter for week files (YYYY-WNN.md)
	const weekFiles = files.filter(f => /^\d{4}-W\d{2}\.md$/.test(f));

	// Sort by week number
	return weekFiles.sort();
}

/**
 * Read tasks from a specific week file
 */
export async function readTasksFromWeekFile(
	weekFile: string,
): Promise<WeekTasks> {
	const filePath = join(getTasksDir(), weekFile);

	if (!existsSync(filePath)) {
		return {weekFile, tasks: []};
	}

	const content = await readFile(filePath, 'utf-8');
	const tasks = parseTasksFromMarkdown(content);

	return {weekFile, tasks};
}

/**
 * Get the next available task number
 */
export function getNextTaskNumber(tasks: Task[]): number {
	if (tasks.length === 0) {
		return 1;
	}

	return Math.max(...tasks.map(t => t.number)) + 1;
}

/**
 * Renumber tasks sequentially starting from 1
 */
export function renumberTasks(tasks: Task[]): Task[] {
	return tasks
		.sort((a, b) => a.number - b.number)
		.map((task, index) => ({
			...task,
			number: index + 1,
		}));
}

/**
 * Get the content to sync to memory (current week's markdown file)
 * Returns the markdown content and the session ID (based on week file name)
 */
export async function getTaskSyncData(): Promise<{
	content: string;
	sessionId: string;
}> {
	const filePath = getCurrentWeekFilePath();
	const weekFileName = getCurrentWeekFile(); // e.g., "2025-W48.md"
	const weekId = weekFileName.replace('.md', ''); // e.g., "2025-W48"

	// Ensure directory exists
	const tasksDir = getTasksDir();
	if (!existsSync(tasksDir)) {
		await mkdir(tasksDir, {recursive: true});
	}

	// If file doesn't exist, create default empty file
	if (!existsSync(filePath)) {
		const emptyMarkdown = writeTasksToMarkdown([]);
		await writeFile(filePath, emptyMarkdown, 'utf-8');
		return {
			content: emptyMarkdown,
			sessionId: `tasks-${weekId}`,
		};
	}

	// Read file content
	const content = await readFile(filePath, 'utf-8');

	return {
		content,
		sessionId: `tasks-${weekId}`,
	};
}

/**
 * Sync current week's tasks to Core API
 * Similar to saveEpisode but for task documents
 */
export async function syncTasksToCore(): Promise<void> {
	// Only sync if we have auth configured
	if (!appConfig.auth) {
		return;
	}

	try {
		const {content, sessionId} = await getTaskSyncData();

		const payload = {
			episodeBody: content,
			referenceTime: new Date().toISOString(),
			sessionId,
			source: 'cli',
			type: 'DOCUMENT',
		};

		await fetch(`${appConfig.auth.url}/api/v1/add`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${appConfig.auth.apiKey}`,
			},
			body: JSON.stringify(payload),
		});
	} catch (error) {
		// Silent failure - don't block task operations if sync fails
		console.warn('Failed to sync tasks to Core:', error);
	}
}
