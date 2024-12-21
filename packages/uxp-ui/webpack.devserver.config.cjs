const path = require("path");
const { merge } = require("webpack-merge"); // Extend base config
const baseConfig = require("./webpack.config.cjs"); // Import root base config

module.exports = merge(baseConfig, {
    output: {
        publicPath: "/"
    
    },
    devServer: {
        static: {
            directory: path.resolve(__dirname, "dist"), // Serve files from the dist folder
        },
        port: 3000, // Port for the development server
        hot: true, // Enable hot module replacement
        historyApiFallback: true,
        watchFiles: [
            path.resolve(__dirname, 'src'),
            path.resolve(__dirname, '../uxp-common'),
          ],
        //open: true, // Automatically open the browser
        proxy: [
            {
                context: ["/api"], // Match paths starting with /api
                target: "http://localhost:3001", // Backend server
                changeOrigin: true, // Handle host header changes
            
                secure: false, // If the backend is using HTTP, not HTTPS
            },
        ],
        
    },
});
