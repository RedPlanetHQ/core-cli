import type {ToolProgressUpdate} from '@/types/core';

/**
 * Global registry for progress callbacks
 * Allows tools to report progress to their UI components
 */
class ProgressRegistry {
	private callbacks: Map<
		string,
		(update: ToolProgressUpdate) => void
	> = new Map();

	/**
	 * Register a progress callback for a tool execution
	 * @param toolCallId - Unique identifier for the tool execution
	 * @param callback - Function to call when progress is reported
	 */
	register(toolCallId: string, callback: (update: ToolProgressUpdate) => void) {
		this.callbacks.set(toolCallId, callback);
	}

	/**
	 * Unregister a progress callback
	 * @param toolCallId - Unique identifier for the tool execution
	 */
	unregister(toolCallId: string) {
		this.callbacks.delete(toolCallId);
	}

	/**
	 * Report progress for a tool execution
	 * @param toolCallId - Unique identifier for the tool execution
	 * @param update - Progress update to report
	 */
	reportProgress(toolCallId: string, update: ToolProgressUpdate) {
		const callback = this.callbacks.get(toolCallId);
		if (callback) {
			callback(update);
		}
	}

	/**
	 * Get a progress reporter function for a tool execution
	 * @param toolCallId - Unique identifier for the tool execution
	 * @returns Function to call when reporting progress
	 */
	getProgressReporter(toolCallId: string): ((update: ToolProgressUpdate) => void) | null {
		const callback = this.callbacks.get(toolCallId);
		return callback || null;
	}
}

// Export singleton instance
export const progressRegistry = new ProgressRegistry();
