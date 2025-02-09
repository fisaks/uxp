const path = require("path");
const { merge } = require("webpack-merge"); // Extend base config
const baseConfig = require("./webpack.config.cjs"); // Import root base config

module.exports = merge(baseConfig, {
    devServer: {
        static: [
            // {
            //   directory: path.resolve(__dirname, "dist"), // Serve files from the dist folder
            // publicPath: "/h2c/",
            //},
            {
                directory: path.resolve(__dirname, "../../public/static/libs"), // Serve files from the dist folder
                publicPath: "/static/libs",
            },
            {
                directory: path.resolve(__dirname, "static"), // Serve 'data' during development
                publicPath: "/static/", // Match the path in your component
            },
        ],
        port: 3010, // Port for the development server
        hot: true, // Enable hot module replacement
        watchFiles: [
            path.resolve(__dirname, "./src"),
            path.resolve(__dirname, "../h2c-common"),
            path.resolve(__dirname, "../uxp-common"),
            path.resolve(__dirname, "../uxp-ui-lib"),
        ],
        //open: true, // Automatically open the browser
        proxy: [
            {
                context: ["/h2c/api"], // Match paths starting with /api
                target: "http://localhost:3011", // Backend server
                changeOrigin: true, // Handle host header changes
                pathRewrite: { "^/h2c/api": "/api" },
                secure: false, // If the backend is using HTTP, not HTTPS
            },
            {
                context: ["/h2c/"], // Match paths starting with /api
                target: "http://localhost:3010", // Backend server
                changeOrigin: true, // Handle host header changes
                pathRewrite: { "^/h2c/": "/" },
                secure: false, // If the backend is using HTTP, not HTTPS
            },
        ],
        historyApiFallback: true,
    },
});
