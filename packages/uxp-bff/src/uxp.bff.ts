process.env.TZ = "UTC";

import fastifyWebsocket from "@fastify/websocket";
import Fastify from "fastify";
import env from "./config/env";

const { AppDataSource } = require("./db/typeorm.config");

import fastifyCookie from "@fastify/cookie";

import {
    AppLogger,
    errorHandler,
    HandlerRegistry,
    IsProd,
    jwtPlugin,
    registerRoutes,
    registerWebSocketHandlers,
} from "@uxp/bff-common";
import "@uxp/bff-common/dist/health/health.controller";
import { ValidateGlobalConfigValue } from "@uxp/common";
import path from "path";

AppDataSource.initialize()
    .then(async () => {
        console.log(`Database connected to ${env.MYSQL_UXP_DATABASE} at ${env.DATABASE_HOST}:${env.DATABASE_PORT}`);
        console.log(
            "Entities:",
            AppDataSource.entityMetadatas.map((meta: { name: string }) => meta.name)
        );
    })
    .catch((err: Error) => console.error("Error during Data Source initialization", err));

const port = 3001;
const fastify = Fastify({
    logger: true,
    ajv: { customOptions: { allErrors: true, $data: true, keywords: [ValidateGlobalConfigValue], coerceTypes: true } },
});
AppLogger.initialize(fastify.log);
fastify.setErrorHandler(errorHandler);
fastify.register(fastifyCookie);
fastify.register(jwtPlugin);
fastify.register(fastifyWebsocket);

// Log incoming request payloads
if (!IsProd) {
    fastify.addHook("preHandler", async (request, reply) => {
        request.log.info({ body: request.body }, "Incoming request payload");
    });
}

// Discover and register REST and WebSocket handlers
HandlerRegistry.discoverHandlers(path.join(__dirname, "./features"));
const restHandlers = HandlerRegistry.getRestHandlers();
const wsHandlers = HandlerRegistry.getWsHandlers();

console.log("restHandlers", restHandlers);
console.log("wsHandlers", wsHandlers);

registerRoutes({
    fastify,
    dataSource: AppDataSource,
    controllers: Array.from(restHandlers),
});
registerWebSocketHandlers({
    fastify,
    dataSource: AppDataSource,
    handlers: Array.from(wsHandlers),
});

// Start the server :)
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`BFF is running at address ${address}`);
});
