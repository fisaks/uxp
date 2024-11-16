import baseConfig from "../../eslint.config.js";

export default [
  ...baseConfig, // Inherit from root config
  {
    files: ["**/*.tsx"], // React TypeScript files
    rules: {
      "react-hooks/rules-of-hooks": "error", // Enforce React hooks rules
      "react-hooks/exhaustive-deps": "warn", // Warn about missing dependencies in useEffect
    },
  },
];
