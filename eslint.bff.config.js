import baseConfig from "./eslint.config.js";

export default [
    ...baseConfig, // Inherit from root config
    {
        languageOptions: {
            globals: {
                process: true,
                __dirname: true, // Node.js globals
            },
        },
        rules: {
            "no-console": "off", // Allow console logs in backend code
            "@typescript-eslint/no-var-requires": "off", // Allow CommonJS-style `require`
        },
    },
];
