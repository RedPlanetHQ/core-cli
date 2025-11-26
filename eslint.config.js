import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default tseslint.config(
	// Base ESLint recommended rules for all files
	eslint.configs.recommended,

	// TypeScript configuration with type-checking
	{
		files: ['source/**/*.ts', 'source/**/*.tsx'],
		ignores: ['source/**/*.spec.ts', 'source/**/*.spec.tsx'],
		extends: [...tseslint.configs.recommendedTypeChecked],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: './tsconfig.json',
				tsconfigRootDir: import.meta.dirname,
			},
		},
		plugins: {
			react: reactPlugin,
			'react-hooks': reactHooksPlugin,
		},
		rules: {
			// React rules
			'react/react-in-jsx-scope': 'off', // Not needed with React 17+
			'react/prop-types': 'off', // Using TypeScript for prop validation
			...reactHooksPlugin.configs.recommended.rules,
			'react-hooks/exhaustive-deps': 'error', // Catch missing dependencies (prevents bugs)

			// TypeScript rules - errors for real bugs
			'@typescript-eslint/no-unused-vars': [
				'error', // Changed to error - unused vars indicate mistakes
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
				},
			],

			// TypeScript rules - warnings for gradual improvement
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-non-null-assertion': 'warn',

			// TypeScript rules - disabled
			'@typescript-eslint/explicit-function-return-type': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',

			// General rules
			'no-console': 'off', // CLI app needs console
			'no-mixed-spaces-and-tabs': 'off', // Handled by Prettier
		},
		settings: {
			react: {
				version: 'detect',
			},
		},
	},

	// Basic linting for JavaScript files (no type-checking)
	{
		files: ['**/*.js'],
		extends: [eslint.configs.recommended],
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},

	// Ignore patterns
	{
		ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'plugins/**'],
	},
);
