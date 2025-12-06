import React from 'react';
import {render, Box, Text} from 'ink';
import {readWeekTasks, writeWeekTasks, getWeekIdentifier} from '@/utils/tasks';
import {TaskState} from '@/types/tasks';
import type {Task} from '@/types/tasks';

// Components
interface TasksListProps {
	weekId: string;
	tasks: Task[];
}

const TasksList: React.FC<TasksListProps> = ({weekId, tasks}) => {
	const todoTasks = tasks.filter(t => t.state === TaskState.TODO);
	const inProgressTasks = tasks.filter(t => t.state === TaskState.IN_PROGRESS);
	const completedTasks = tasks.filter(t => t.state === TaskState.COMPLETED);

	return (
		<Box flexDirection="column" paddingY={1}>
			<Text bold color="blue">
				📋 Tasks for {weekId}
			</Text>
			<Text>{''}</Text>

			{todoTasks.length > 0 && (
				<>
					<Text bold color="yellow">
						## Todo
					</Text>
					<Text>{''}</Text>
					{todoTasks.map(task => (
						<Text key={task.number}>
							{task.number}. {task.description}
						</Text>
					))}
					<Text>{''}</Text>
				</>
			)}

			{inProgressTasks.length > 0 && (
				<>
					<Text bold color="cyan">
						## In Progress
					</Text>
					<Text>{''}</Text>
					{inProgressTasks.map(task => (
						<Text key={task.number}>
							{task.number}. {task.description}
						</Text>
					))}
					<Text>{''}</Text>
				</>
			)}

			{completedTasks.length > 0 && (
				<>
					<Text bold color="green">
						## Completed
					</Text>
					<Text>{''}</Text>
					{completedTasks.map(task => (
						<Text key={task.number}>
							{task.number}. {task.description}
						</Text>
					))}
					<Text>{''}</Text>
				</>
			)}

			<Text dimColor>
				Summary: {todoTasks.length} todo, {inProgressTasks.length} in progress,{' '}
				{completedTasks.length} completed
			</Text>
		</Box>
	);
};

interface ErrorMessageProps {
	message: string;
	usage?: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({message, usage}) => (
	<Box flexDirection="column" paddingY={1}>
		<Text color="red">❌ {message}</Text>
		{usage && (
			<>
				<Text>{''}</Text>
				<Text dimColor>{usage}</Text>
			</>
		)}
	</Box>
);

interface SuccessMessageProps {
	message: string;
}

const SuccessMessage: React.FC<SuccessMessageProps> = ({message}) => (
	<Box paddingY={1}>
		<Text color="green">✅ {message}</Text>
	</Box>
);

// Command handlers
export async function handleTasksList(): Promise<void> {
	const tasks = await readWeekTasks();
	const weekId = getWeekIdentifier();

	const {waitUntilExit} = render(<TasksList weekId={weekId} tasks={tasks} />);
	await waitUntilExit();
	process.exit(0);
}

export async function handleTasksAdd(description: string): Promise<void> {
	if (!description) {
		const {waitUntilExit} = render(
			<ErrorMessage
				message="Please provide a task description"
				usage="Usage: core-cli tasks add <description>"
			/>,
		);
		await waitUntilExit();
		process.exit(1);
	}

	const tasks = await readWeekTasks();
	const maxNumber =
		tasks.length > 0 ? Math.max(...tasks.map(t => t.number)) : 0;
	const newTask = {
		number: maxNumber + 1,
		description: description,
		state: TaskState.TODO,
		tags: [],
	};

	tasks.push(newTask);
	await writeWeekTasks(tasks);

	const {waitUntilExit} = render(
		<SuccessMessage
			message={`Added task #${newTask.number}: ${description}`}
		/>,
	);
	await waitUntilExit();
	process.exit(0);
}

export async function handleTasksUpdate(
	taskNumber: number,
	description: string,
): Promise<void> {
	if (!taskNumber || !description) {
		const {waitUntilExit} = render(
			<ErrorMessage
				message="Please provide task number and description"
				usage="Usage: core-cli tasks update <task#> <description>"
			/>,
		);
		await waitUntilExit();
		process.exit(1);
	}

	const tasks = await readWeekTasks();
	const taskIndex = tasks.findIndex(t => t.number === taskNumber);

	if (taskIndex === -1) {
		const {waitUntilExit} = render(
			<ErrorMessage message={`Task #${taskNumber} not found`} />,
		);
		await waitUntilExit();
		process.exit(1);
	}

	tasks[taskIndex].description = description;
	await writeWeekTasks(tasks);

	const {waitUntilExit} = render(
		<SuccessMessage message={`Updated task #${taskNumber}: ${description}`} />,
	);
	await waitUntilExit();
	process.exit(0);
}

export async function handleTasksDelete(taskNumber: number): Promise<void> {
	if (!taskNumber) {
		const {waitUntilExit} = render(
			<ErrorMessage
				message="Please provide a task number"
				usage="Usage: core-cli tasks delete <task#>"
			/>,
		);
		await waitUntilExit();
		process.exit(1);
	}

	const tasks = await readWeekTasks();
	const taskIndex = tasks.findIndex(t => t.number === taskNumber);

	if (taskIndex === -1) {
		const {waitUntilExit} = render(
			<ErrorMessage message={`Task #${taskNumber} not found`} />,
		);
		await waitUntilExit();
		process.exit(1);
	}

	const deletedTask = tasks[taskIndex];
	tasks.splice(taskIndex, 1);
	await writeWeekTasks(tasks);

	const {waitUntilExit} = render(
		<SuccessMessage
			message={`Deleted task #${taskNumber}: ${deletedTask.description}`}
		/>,
	);
	await waitUntilExit();
	process.exit(0);
}

export async function handleTasksHelp(): Promise<void> {
	const {waitUntilExit} = render(
		<Box flexDirection="column" paddingY={1}>
			<Text bold color="blue">
				📋 Tasks Commands
			</Text>
			<Text>{''}</Text>
			<Text bold>core-cli tasks list</Text>
			<Text dimColor>  List all tasks for the current week</Text>
			<Text>{''}</Text>
			<Text bold>core-cli tasks add &lt;description&gt;</Text>
			<Text dimColor>  Add a new task</Text>
			<Text dimColor>  Example: core-cli tasks add Implement user authentication</Text>
			<Text>{''}</Text>
			<Text bold>core-cli tasks update &lt;task#&gt; &lt;description&gt;</Text>
			<Text dimColor>  Update an existing task</Text>
			<Text dimColor>  Example: core-cli tasks update 42 Fix login bug</Text>
			<Text>{''}</Text>
			<Text bold>core-cli tasks delete &lt;task#&gt;</Text>
			<Text dimColor>  Delete a task</Text>
			<Text dimColor>  Example: core-cli tasks delete 42</Text>
			<Text>{''}</Text>
			<Text bold>core-cli tasks help</Text>
			<Text dimColor>  Show this help message</Text>
		</Box>,
	);
	await waitUntilExit();
	process.exit(0);
}

export async function handleTasksCommand(
	subcommand?: string,
	args: string[] = [],
) {
	if (!subcommand || subcommand === 'list') {
		await handleTasksList();
		return;
	}

	if (subcommand === 'add') {
		const description = args.join(' ');
		await handleTasksAdd(description);
		return;
	}

	if (subcommand === 'update') {
		const taskNumber = parseInt(args[0], 10);
		const description = args.slice(1).join(' ');
		await handleTasksUpdate(taskNumber, description);
		return;
	}

	if (subcommand === 'delete') {
		const taskNumber = parseInt(args[0], 10);
		await handleTasksDelete(taskNumber);
		return;
	}

	if (subcommand === 'help') {
		await handleTasksHelp();
		return;
	}

	const {waitUntilExit} = render(
		<ErrorMessage
			message={`Unknown tasks subcommand: ${subcommand}`}
			usage="Available subcommands: list, add, update, delete, help"
		/>,
	);
	await waitUntilExit();
	process.exit(1);
}
