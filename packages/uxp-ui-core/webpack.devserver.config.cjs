const path = require("path");
const { merge } = require("webpack-merge"); // Extend base config
const baseConfig = require("./webpack.config.cjs"); // Import root base config

module.exports = merge(baseConfig, {
  devServer: {
    static: {
      directory: path.resolve(__dirname, "dist"), // Serve files from the dist folder
    },
    port: 3000, // Port for the development server
    hot: true, // Enable hot module replacement
    open: true, // Automatically open the browser
  },
});
