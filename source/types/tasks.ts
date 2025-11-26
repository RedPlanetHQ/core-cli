export enum TaskState {
	TODO = 'todo',
	IN_PROGRESS = 'in_progress',
	COMPLETED = 'completed',
}

export enum Priority {
	HIGH = 'high',
	MEDIUM = 'medium',
	LOW = 'low',
}

export interface Task {
	number: number;
	description: string;
	state: TaskState;
	tags: string[];
	priority?: Priority;
	completedAt?: string; // ISO date string
}

export interface WeekTasks {
	weekFile: string; // e.g., "2025-W48.md"
	tasks: Task[];
}
