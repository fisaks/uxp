const path = require("path");
const { merge } = require("webpack-merge"); // Extend base config
const baseConfig = require("./webpack.config.cjs"); // Import root base config

module.exports = merge(baseConfig, {
    devServer: {
        static: {
            directory: path.resolve(__dirname, 'static'), // Serve 'data' during development
            publicPath: '/static/', // Match the path in your component
        },
        port: 3010, // Port for the development server
        hot: true, // Enable hot module replacement
        watchFiles: [
            path.resolve(__dirname, 'src'),
            path.resolve(__dirname, '../h2c-common'),
            path.resolve(__dirname, '../uxp-common'),
        ],
        //open: true, // Automatically open the browser
        proxy: [
            {
                context: ["/api"], // Match paths starting with /api
                target: "http://localhost:3011", // Backend server
                changeOrigin: true, // Handle host header changes

                secure: false, // If the backend is using HTTP, not HTTPS
            },
        ],
        historyApiFallback: true,
    },
});
