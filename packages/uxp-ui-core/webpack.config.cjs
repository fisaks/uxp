const path = require("path");
const { merge } = require("webpack-merge"); // Extend base config
const baseConfig = require("../../webpack.config.base.cjs"); // Import root base config
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = merge(baseConfig, {
    mode: "development",
    devtool: "eval-source-map",

    entry: "./src/index.tsx", // Entry point for this package

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
