const path = require("path");
//const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");


module.exports = {
    resolve: {
        extensions: [".ts", ".tsx", ".js"], // Support TypeScript and JavaScript files
        modules: [path.resolve(__dirname, "node_modules"), "node_modules"], // Resolve dependencies
        mainFields: ["browser", "module", "main"],
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                exclude: /node_modules/,
                use: "ts-loader", // Process TypeScript files
            },
            {
                test: /\.css$/,
                use: ["style-loader", "css-loader"], // Process CSS files
            },
            {
                test: /\.(png|jpg|jpeg|gif|svg)$/i, // Matches common image formats
                type: 'asset', // Automatically chooses between 'asset/resource' and 'asset/inline'
                generator: {
                  filename: 'images/[name][hash][ext]', // Custom output folder for images
                },
                parser: {
                  dataUrlCondition: {
                    maxSize: 8 * 1024, // Images below 8KB are inlined as base64
                  },
                },
              },
        ],
    },
    //plugins: [
      //  new BundleAnalyzerPlugin(),
    //]
};
