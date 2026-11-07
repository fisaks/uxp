const path = require("path");
const { merge } = require("webpack-merge");
const baseConfig = require("./webpack.config.cjs");

module.exports = merge(baseConfig, {
    devServer: {
        static: [
            {
                directory: path.resolve(__dirname, "../../public/static/libs"),
                publicPath: "/static/libs",
            },
        ],
        port: 3050,
        host: "0.0.0.0",
        allowedHosts: "all",
        hot: true,
        client: {
            webSocketURL: "auto://0.0.0.0:0/ws-vid",
        },
        webSocketServer: {
            options: { path: "/ws-vid" },
        },
        watchFiles: [path.resolve(__dirname, "./src"), path.resolve(__dirname, "../vid-common"), path.resolve(__dirname, "../uxp-common"), path.resolve(__dirname, "../uxp-ui-lib")],
        proxy: [
            {
                context: ["/vid/api"],
                target: "http://localhost:3051",
                changeOrigin: true,
                pathRewrite: { "^/vid/api": "/api" },
                secure: false,
            },
            {
                context: ["/vid/"],
                target: "http://localhost:3050",
                changeOrigin: true,
                pathRewrite: { "^/vid/": "/" },
                secure: false,
            },
        ],
        historyApiFallback: true,
    },
});
