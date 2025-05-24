// eslint.config.js
import typescriptEslint from "@typescript-eslint/eslint-plugin";
import typescriptParser from "@typescript-eslint/parser";
import eslint from "@eslint/js";
import prettier from "eslint-config-prettier";
import typescript from "typescript-eslint";

export default [
	// Base configuration for all files
	eslint.configs.recommended,
    ...typescript.configs.recommended,
	
	// TypeScript-specific configuration
	{
		files: ["**/*.ts", "**/*.tsx"],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: {
				ecmaVersion: "latest",
				sourceType: "module",
			},
			globals: {
				// Browser globals
				window: "readonly",
				document: "readonly",
				console: "readonly",
				alert: "readonly",
				prompt: "readonly",
				localStorage: "readonly",
				sessionStorage: "readonly",
				setTimeout: "readonly",
				setInterval: "readonly",
				clearTimeout: "readonly",
				clearInterval: "readonly",
				// Phaser globals
				Phaser: "readonly",
			},
		},
		plugins: {
			"@typescript-eslint": typescriptEslint,
		},
		rules: {
			// Base ESLint recommended rules
			...eslint.configs.recommended.rules,
			
			// TypeScript ESLint recommended rules
			...typescriptEslint.configs.recommended.rules,
			
			// Custom rules
			"semi": "error",
			"prefer-const": "error",
			
			// Disable base ESLint rules that are covered by TypeScript equivalents
			"no-unused-vars": "off",
			"@typescript-eslint/no-unused-vars": ["error", { 
				"argsIgnorePattern": "^_",
				"varsIgnorePattern": "^_",
				"destructuredArrayIgnorePattern": "^_"
			}],
			"no-undef": "off", // TypeScript handles this
			
			// Allow any types in certain contexts (can be tightened later)
			"@typescript-eslint/no-explicit-any": "warn",
			"@typescript-eslint/no-empty-object-type": "warn",
			"@typescript-eslint/no-unsafe-function-type": "warn",
			"@typescript-eslint/no-unused-expressions": "warn",
		},
	},
	// Ignore patterns (replaces .eslintignore)
	{
		ignores: [
			"node_modules/**",
			"dist/**",
			"build/**",
			"*.min.js",
            "**/*mjs",
            "**/*.cjs",
            "**/*.js",
		],
	},
    prettier,
];