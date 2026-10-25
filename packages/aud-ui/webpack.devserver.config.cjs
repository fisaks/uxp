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
        port: 3040,
        host: "0.0.0.0",
        allowedHosts: "all",
        hot: true,
        client: {
            webSocketURL: "auto://0.0.0.0:0/ws-aud",
        },
        webSocketServer: {
            options: { path: "/ws-aud" },
        },
        watchFiles: [path.resolve(__dirname, "./src"), path.resolve(__dirname, "../aud-common"), path.resolve(__dirname, "../uxp-common"), path.resolve(__dirname, "../uxp-ui-lib")],
        proxy: [
            {
                context: ["/aud/api"],
                target: "http://localhost:3041",
                changeOrigin: true,
                pathRewrite: { "^/aud/api": "/api" },
                secure: false,
            },
            {
                context: ["/aud/ws-api"],
                target: "http://localhost:3041",
                ws: true,
                changeOrigin: true,
                pathRewrite: { "^/aud/ws-api": "/ws-api" },
                secure: false,
            },
            {
                context: ["/aud/"],
                target: "http://localhost:3040",
                changeOrigin: true,
                pathRewrite: { "^/aud/": "/" },
                secure: false,
            },
        ],
        historyApiFallback: true,
    },
});
