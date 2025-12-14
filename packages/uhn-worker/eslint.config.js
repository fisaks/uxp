import baseConfig from "../../eslint.bff.config.js";

export default [
    ...baseConfig, // Inherit from root config
    {
        files: ["**/*.ts"], // TypeScript files
    },
];
