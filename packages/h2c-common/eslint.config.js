import baseConfig from "../../eslint.common.config.js";

export default [
    ...baseConfig, // Inherit from root config
    {
        files: ["**/*.ts"], // TypeScript files
    },
];
