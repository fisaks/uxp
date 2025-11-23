const path = require("path");
const { merge } = require("webpack-merge"); // Extend base config
const baseConfig = require("./webpack.config.cjs"); // Import root base config

module.exports = merge(baseConfig, {
    devServer: {
        static: [
            {
                directory: path.resolve(__dirname, "../../public/static/libs"), // Serve files from the dist folder
                publicPath: "/static/libs",
            },
            {
                directory: path.resolve(__dirname, "static"), // Serve 'data' during development
                publicPath: "/static/", // Match the path in your component
            },
        ],
        port: 3030, // Port for the development server
        hot: true, // Enable hot module replacement
        watchFiles: [
            path.resolve(__dirname, "./src"),
            path.resolve(__dirname, "../uhn-common"),
            path.resolve(__dirname, "../uxp-common"),
            path.resolve(__dirname, "../uxp-ui-lib"),
        ],
        //open: true, // Automatically open the browser
        proxy: [
            {
                context: ["/uhn/api"], // Match paths starting with /api
                target: "http://localhost:3031", // Backend server
                changeOrigin: true, // Handle host header changes
                pathRewrite: { "^/uhn/api": "/api" },
                secure: false, // If the backend is using HTTP, not HTTPS
            },
            {
                context: ["/uhn/ws-api"], // Match paths starting with /api
                target: "http://localhost:3031", // Backend server
                ws: true,
                changeOrigin: true, // Handle host header changes
                pathRewrite: { "^/uhn/ws-api": "/ws-api" },
                secure: false, // If the backend is using HTTP, not HTTPS
            },
            {
                context: ["/uhn/"], // Match paths starting with /api
                target: "http://localhost:3030", // Backend server
                changeOrigin: true, // Handle host header changes
                pathRewrite: { "^/uhn/": "/" },
                secure: false, // If the backend is using HTTP, not HTTPS
            },
        ],
        historyApiFallback: true,
    },
});
