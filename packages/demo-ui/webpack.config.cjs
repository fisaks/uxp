process.env.META_TAG = "uxp-demo";

const path = require("path");
const { merge } = require("webpack-merge"); // Extend base config
const baseConfig = require("../../webpack.config.base.cjs"); // Import root base config
const HtmlWebpackPlugin = require("html-webpack-plugin");
const htmlWebpackInjectAttributesPlugin = require("html-webpack-inject-attributes-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = merge(baseConfig, {
    mode: "development",
    devtool: "eval-source-map",

    entry: {
        "uxp-demo-ui": "./src/index.tsx", // Entry point for this package
    },
    resolve: {
        alias: {
            ajv$: require.resolve("ajv"), // Resolve to AJV v8
            "ajv-formats$": require.resolve("ajv-formats"), // Resolve to AJV-formats v3
        },
    },

    output: {
        filename: "[name].bundle.js", // Unique names for entry points
        chunkFilename: "uxp-demo-[name].js", // Unique names for lazy-loaded chunks
        path: path.resolve(__dirname, "dist"), // Output directory for the build
        clean: true,
        library: {
            name: "uxp-demo",
            type: "window",
        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./index.html", // Use your template file
            filename: "index.html", // Name of the output file
            publicPath: "/demo/",
        }),
        new HtmlWebpackPlugin({
            template: "./view.html", // Use your template file
            filename: "view.html", // Name of the output file
            publicPath: "/demo/",
        }),

        new htmlWebpackInjectAttributesPlugin({
            "data-uxp-remote-app": process.env.META_TAG,
        }),

        new CopyWebpackPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, "static"), // Source folder (relative to project root)
                    to: path.resolve(__dirname, "dist/static"), // Destination folder
                },
            ],
        }),
    ],
});
