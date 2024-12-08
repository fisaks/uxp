const path = require("path");
const { merge } = require("webpack-merge"); // Extend base config
const baseConfig = require("../../webpack.config.base.cjs"); // Import root base config
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = merge(baseConfig, {
    mode: "development",
    devtool: "eval-source-map",

    entry: "./src/index.tsx", // Entry point for this package
    resolve: {
        alias: {
            ajv$: require.resolve("ajv"), // Resolve to AJV v8
            "ajv-formats$": require.resolve("ajv-formats"), // Resolve to AJV-formats v3
        },
    },

    
    output: {
        filename: "uxp-ui-core.bundle.js",
        path: path.resolve(__dirname, "dist"), // Output directory for the build
        clean: true,
    },

    plugins: [
        new HtmlWebpackPlugin({
            template: "./index.html", // Use your template file
            filename: "index.html", // Name of the output file
        }),
    ],
});
