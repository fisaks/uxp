const path = require("path");
const { merge } = require("webpack-merge"); // Extend base config
const baseConfig = require("./webpack.config.cjs"); // Import root base config

module.exports = merge(baseConfig, {
    output: {
        publicPath: "/",
    },
    devServer: {
        static: [
            {
                directory: path.resolve(__dirname, "dist"), // Serve files from the dist folder
                publicPath: "/",
            },
            {
                directory: path.resolve(__dirname, "../../public/static/libs"), // Serve files from the dist folder
                publicPath: "/static/libs",
            },
            {
                directory: path.resolve(__dirname, "../../public/static"), // Serve files from the dist folder
                publicPath: "/static",
            },

        ],
        port: 3000, // Port for the development server
        host: "0.0.0.0", // Allow access from LAN and Docker
        allowedHosts: "all", // Accept requests from nginx reverse proxy and mobile devices
        hot: true, // Enable hot module replacement
        client: {
            webSocketURL: "auto://0.0.0.0:0/ws", // Use the browser's own host/port/protocol for HMR WebSocket
        },
        historyApiFallback: true,
        watchFiles: [path.resolve(__dirname, "src"), path.resolve(__dirname, "../uxp-common")],
        //open: true, // Automatically open the browser
        proxy: [
            {
                context: ["/api"], // Match paths starting with /api
                target: "http://localhost:3001", // Backend server
                changeOrigin: true, // Handle host header changes

                secure: false, // If the backend is using HTTP, not HTTPS
            },
            {
                context: ["/ws-api"], // Match paths starting with /ws-api
                target: "http://localhost:3001", // Backend server
                changeOrigin: true, // Handle host header changes
                ws: true,
                secure: false, // If the backend is using HTTP, not HTTPS
            },
            // Remote app HMR WebSockets — forward to each app's dev server
            {
                context: ["/ws-uhn"],
                target: "http://localhost:3030",
                ws: true,
            },
            {
                context: ["/ws-h2c"],
                target: "http://localhost:3010",
                ws: true,
            },
            {
                context: ["/ws-demo"],
                target: "http://localhost:3020",
                ws: true,
            },
        ],
    },
});
