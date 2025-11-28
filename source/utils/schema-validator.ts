/**
 * Schema validation utility to catch and fix common parameter structure issues
 *
 * This addresses the issue where LLMs sometimes "flatten" nested object parameters
 * instead of respecting the schema structure.
 *
 * Example problem:
 * Schema defines: { integrationSlug: string, action: string, parameters: object }
 * LLM provides: { integrationSlug: "github", action: "list_issues", owner: "foo", repo: "bar" }
 * Should be: { integrationSlug: "github", action: "list_issues", parameters: { owner: "foo", repo: "bar" } }
 */

interface JSONSchema {
	type?: string;
	properties?: Record<string, JSONSchema>;
	required?: string[];
	additionalProperties?: boolean;
	[key: string]: unknown;
}

interface ValidationResult {
	valid: boolean;
	fixed?: Record<string, unknown>;
	errors?: string[];
}

/**
 * Validate and auto-fix tool arguments against a JSON schema
 *
 * Specifically handles the "flattened nested object" anti-pattern where
 * the LLM puts nested object properties at the top level instead of
 * inside their parent object parameter.
 *
 * @param args - The arguments provided by the LLM
 * @param schema - The JSON schema defining expected structure
 * @returns Validation result with auto-fixed arguments if applicable
 */
export function validateAndFixSchema(
	args: Record<string, unknown>,
	schema: JSONSchema,
): ValidationResult {
	if (!schema.properties) {
		// No schema to validate against
		return {valid: true};
	}

	const errors: string[] = [];
	const fixed: Record<string, unknown> = {...args};
	let needsFix = false;

	// Find nested object parameters in the schema
	const nestedObjectParams = Object.entries(schema.properties).filter(
		([_, propSchema]) =>
			typeof propSchema === 'object' &&
			propSchema.type === 'object' &&
			propSchema.properties,
	);

	// Check each nested object parameter
	for (const [paramName, paramSchema] of nestedObjectParams) {
		if (typeof paramSchema !== 'object' || !paramSchema.properties) {
			continue;
		}

		const expectedNestedKeys = Object.keys(paramSchema.properties);

		// Check if any expected nested keys are at the top level (flattened)
		const flattenedKeys = expectedNestedKeys.filter(
			key => key in args && !(paramName in args),
		);

		if (flattenedKeys.length > 0) {
			// Found flattened parameters - need to fix
			needsFix = true;

			// Collect all flattened values into the nested object
			const nestedObject: Record<string, unknown> = {};
			for (const key of flattenedKeys) {
				nestedObject[key] = args[key];
				delete fixed[key]; // Remove from top level
			}

			// If the nested param already exists and is an object, merge
			if (paramName in fixed && typeof fixed[paramName] === 'object') {
				fixed[paramName] = {
					...(fixed[paramName] as Record<string, unknown>),
					...nestedObject,
				};
			} else {
				fixed[paramName] = nestedObject;
			}

			errors.push(
				`Parameter structure error: Found ${flattenedKeys.join(', ')} at top level, but they should be nested inside '${paramName}'. Auto-fixed.`,
			);
		}
	}

	// Check for missing required parameters
	if (schema.required) {
		const missingRequired = schema.required.filter(
			req => !(req in fixed),
		);
		if (missingRequired.length > 0) {
			errors.push(
				`Missing required parameters: ${missingRequired.join(', ')}`,
			);
			return {valid: false, errors};
		}
	}

	if (needsFix) {
		return {
			valid: true, // We fixed it, so it's valid now
			fixed,
			errors, // Include errors as warnings about what was fixed
		};
	}

	return {valid: true};
}

/**
 * Extract schema from MCP tool definition or AI SDK tool
 */
export function getToolSchema(tool: {inputSchema?: unknown}): JSONSchema | null {
	if (!tool.inputSchema) {
		return null;
	}

	// MCP tools have inputSchema as JSON Schema
	if (typeof tool.inputSchema === 'object') {
		return tool.inputSchema as JSONSchema;
	}

	return null;
}
