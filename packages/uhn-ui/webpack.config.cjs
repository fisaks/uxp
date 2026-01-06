process.env.META_TAG = "uhn";

const path = require("path");
const { merge } = require("webpack-merge"); // Extend base config
const baseConfig = require("../../webpack.config.base.cjs"); // Import root base config
const HtmlWebpackPlugin = require("html-webpack-plugin");
const htmlWebpackInjectAttributesPlugin = require("html-webpack-inject-attributes-plugin");


module.exports = merge(baseConfig, {
    mode: "development",
    devtool: "eval-source-map",

    entry: {
        "uhn-ui": "./src/index.tsx", // Entry point for this package
    },
    resolve: {
        alias: {
            ajv$: require.resolve("ajv"), // Resolve to AJV v8
            "ajv-formats$": require.resolve("ajv-formats"), // Resolve to AJV-formats v3
        },
    },

    output: {
        filename: "[name].bundle.js", // Unique names for entry points
        chunkFilename: "uhn-[name].js", // Unique names for lazy-loaded chunks
        path: path.resolve(__dirname, "dist"), // Output directory for the build
        clean: true,
        library: {
            name: "uhn",
            type: "window",
        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./index.html", // Use your template file
            filename: "index.html", // Name of the output file
            publicPath: "/uhn/",
        }),
        new HtmlWebpackPlugin({
            template: "./health.html", // Use your template file
            filename: "health.html", // Name of the output file
            publicPath: "/uhn/",
        }),
        new htmlWebpackInjectAttributesPlugin({
            "data-uxp-remote-app": process.env.META_TAG,
        })

    ],
});
