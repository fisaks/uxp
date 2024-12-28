import baseConfig from "../../eslint.ui.config.js";

export default [
    ...baseConfig, // Inherit from root config
    {
        files: ["**/*.tsx", "**/*.ts"], // React TypeScript files
    },
];
