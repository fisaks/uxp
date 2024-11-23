import baseConfig from "../../eslint.config.js";

export default [
    ...baseConfig, // Inherit from root config
    {
        files: ["**/*.ts"], // TypeScript files
        rules: {
            "@typescript-eslint/no-explicit-any": "error", // Disallow `any`
            "@typescript-eslint/consistent-type-definitions": ["warn", "type"], // Prefer `type` over `interface`
        },
    },
];
