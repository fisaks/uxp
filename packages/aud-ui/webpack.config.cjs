process.env.META_TAG = "uxp-aud";

const path = require("path");
const { merge } = require("webpack-merge");
const baseConfig = require("../../webpack.config.base.cjs");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const htmlWebpackInjectAttributesPlugin = require("html-webpack-inject-attributes-plugin");

module.exports = merge(baseConfig, {
    mode: "development",
    devtool: "eval-source-map",

    entry: {
        "uxp-aud-ui": "./src/index.tsx",
    },

    output: {
        filename: "[name].bundle.js",
        chunkFilename: "uxp-aud-[name].js",
        path: path.resolve(__dirname, "dist"),
        clean: true,
        library: {
            name: "uxp-aud",
            type: "window",
        },
    },
    plugins: [
        new HtmlWebpackPlugin({
            template: "./index.html",
            filename: "index.html",
            publicPath: "/aud/",
        }),
        new HtmlWebpackPlugin({
            template: "./system.html",
            filename: "system.html",
            publicPath: "/aud/",
        }),

        new htmlWebpackInjectAttributesPlugin({
            "data-uxp-remote-app": process.env.META_TAG,
        }),
    ],
});
