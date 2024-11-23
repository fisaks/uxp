import js from "@eslint/js"; // Core JavaScript rules
import ts from "@typescript-eslint/eslint-plugin"; // TypeScript rules
import tsParser from "@typescript-eslint/parser"; // TypeScript parser
import react from "eslint-plugin-react"; // React rules

export default [
  // Base JavaScript configuration
  js.configs.recommended,

  // TypeScript configuration
  {
    files: ["**/*.ts", "**/*.tsx"], // Apply to TypeScript files
    languageOptions: {
      parser: tsParser, // Use the TypeScript parser
      parserOptions: {
        ecmaVersion: 2021, // Support modern JavaScript features
        sourceType: "module", // Use ES modules
        ecmaFeatures: {
          jsx: true, // Enable JSX for React
        },
      },

      globals: {
        console: true, // Explicitly allow console as a global
        window: true, // Browser global
        document: true, // Browser global
        process: true, // Node.js global
        __dirname: true, // Node.js global
        module: true, // Node.js module system
        require: true, // Node.js `require` function
        exports: true, // Node.js `exports` global
        __WebpackModuleApi: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": ts,
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }], // Ignore unused vars starting with '_'
      "@typescript-eslint/no-explicit-any": "warn", // Discourage `any`
      "no-unused-vars": "off",
    },
  },

  // React configuration (shared by React apps and libraries)
  {
    files: ["**/*.tsx"], // Apply to TypeScript files containing JSX
    plugins: {
      react,
    },
    settings: {
      react: {
        version: "detect", // Automatically detect React version
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off", // React 17+ JSX transform
      "react/prop-types": "off", // Disable prop-types in TypeScript
    },
  },

  // Global ignores
  {
    ignores: ["node_modules", "packages/*/node_modules", "**/dist/**", "**/build/**", "**/*.d.ts", "**/*.config.cjs"], // Ignore common folders and declaration files
  },
];
