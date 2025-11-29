/**
 * List of models that support reasoning/thinking capabilities
 */

export const REASONING_MODELS = new Set([
	'gpt-5.1-2025-11-13',
]);

/**
 * Check if a model supports reasoning based on model ID
 */
export function isReasoningModel(modelId: string): boolean {
	return REASONING_MODELS.has(modelId);
}
