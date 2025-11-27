import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {getToolManager} from '@/message-handler';
import {logError} from './message-queue';

// Get the project root directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..');
const routinesDir = path.join(projectRoot, 'routines');

export interface Routine {
	name: string;
	content: string;
}

export interface DocumentListItem {
	id: string;
	title: string;
	createdAt: string;
}

export interface DocumentFullItem {
	id: string;
	title: string;
	createdAt: string;
	content: string;
	source: string;
}

/**
 * Get all available routines from the routines directory and MCP core server
 */
export async function getRoutines(): Promise<Routine[]> {
	const routines: Routine[] = [];

	// Get routines from local files
	try {
		await fs.access(routinesDir);
		const files = await fs.readdir(routinesDir);

		for (const file of files) {
			if (file.endsWith('.md')) {
				const routineName = path.basename(file, '.md');
				const filePath = path.join(routinesDir, file);
				const content = await fs.readFile(filePath, 'utf-8');

				routines.push({
					name: routineName,
					content: content.trim(),
				});
			}
		}
	} catch {
		// If routines directory doesn't exist or can't be read, continue
	}

	// Get routines from MCP core server documents
	try {
		const toolManager = getToolManager();
		if (toolManager) {
			const connectedServers = toolManager.getConnectedServers();
			if (connectedServers.includes('core')) {
				// Get the get_documents tool handler
				const getDocumentsHandler = toolManager.getToolHandler(
					'memory_get_documents',
				);

				if (getDocumentsHandler) {
					// Fetch all documents
					const documentsResult = JSON.parse(
						await getDocumentsHandler({}),
					) as DocumentListItem[];

					if (documentsResult && typeof documentsResult === 'object') {
						const documents = documentsResult;

						// Get the get_document tool handler
						const getDocumentHandler = toolManager.getToolHandler(
							'memory_get_document',
						);

						if (getDocumentHandler) {
							// Fetch each document's content
							for (const doc of documents) {
								if (doc && doc.id && doc.title) {
									try {
										const documentResult = JSON.parse(
											await getDocumentHandler({
												documentId: doc.id,
											}),
										) as DocumentFullItem;

										if (documentResult && 'content' in documentResult) {
											const content = documentResult.content;

											// Format the title: replace spaces with underscores and lowercase
											const routineName = doc.title
												.toLowerCase()
												.replace(/\s+/g, '_');

											routines.push({
												name: routineName,
												content: content || '',
											});
										}
										// eslint-disable-next-line @typescript-eslint/no-unused-vars
									} catch (error) {
										// Skip documents that fail to load
										logError(`Failed to load document ${doc.title}`);
									}
								}
							}
						}
					}
				}
			}
		}
	} catch (error) {
		// If MCP fetching fails, continue with local routines only
		console.error('Failed to fetch routines from MCP core server:', error);
	}

	return routines.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get a specific routine by name
 */
export async function getRoutine(name: string): Promise<Routine | null> {
	try {
		const filePath = path.join(routinesDir, `${name}.md`);
		const content = await fs.readFile(filePath, 'utf-8');

		return {
			name,
			content: content.trim(),
		};
	} catch {
		return null;
	}
}

/**
 * Get routine names for autocomplete
 */
export async function getRoutineNames(): Promise<string[]> {
	const routines = await getRoutines();
	return routines.map(r => r.name);
}
