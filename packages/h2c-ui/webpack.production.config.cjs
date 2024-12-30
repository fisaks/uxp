const path = require("path");
const { merge } = require("webpack-merge"); // Extend base config
const baseConfig = require("./webpack.config.cjs"); // Import root base config

const TerserPlugin = require("terser-webpack-plugin");

module.exports = merge(baseConfig, {
    mode: "production",
    devtool: false,

    output: {
        filename: "[name].[contenthash].bundle.js", // Unique names for entry points
        chunkFilename: "h2c-[name].[contenthash].js", // Unique names for lazy-loaded chunks
        path: path.resolve(__dirname, "dist"), // Output directory for the build
        clean: true,
        library: {
            name: "h2c",
            type: "window",
        },
    },

    optimization: {
        minimize: true, // Enable minimization
        minimizer: [
            new TerserPlugin({
                extractComments: false, // Do not generate separate license files
                parallel: true, // Enable parallel processing for faster builds
                terserOptions: {
                    // https://github.com/webpack-contrib/terser-webpack-plugin#terseroptions
                    mangle: true, // Shorten variable names
                    module: true, // Optimize ES modules where possible
                    compress: {
                        drop_console: true, // Remove console.log statements
                        drop_debugger: true, // Remove debugger statements
                        ecma: 2015, // Specify ECMAScript target for optimizations
                        passes: 2, // Perform multiple passes for better optimization
                    },
                    format: {
                        comments: false, // Remove all comments
                    },
                },
            }),
        ],
    },
});
