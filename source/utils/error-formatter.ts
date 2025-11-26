/**
 * Format error objects into string messages
 * Handles Error instances and unknown error types consistently
 *
 * This utility eliminates the repeated pattern of:
 * ```
 * error instanceof Error ? error.message : String(error)
 * ```
 *
 * @param error - Error of any type (Error instance, string, object, etc.)
 * @returns Formatted error message string
 *
 * @example
 * try {
 *   await doSomething();
 * } catch (error) {
 *   const message = formatError(error);
 *   console.error(message);
 * }
 */
export function formatError(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}
