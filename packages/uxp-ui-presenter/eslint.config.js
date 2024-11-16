import baseConfig from "../../eslint.config.js";

export default [
  ...baseConfig, // Inherit from root config
  {
    files: ["**/*.tsx"], // React TypeScript files
    rules: {
      "@typescript-eslint/explicit-module-boundary-types": "warn", // Require explicit return types for exported functions
      "react/no-unused-prop-types": "warn", // Warn about unused props in components
    },
  },
];
