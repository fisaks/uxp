import path from "path";

require("./config/env");
const env = require("./config/envValidator");
const { AppDataSource } = require("./db/typeorm.config");

import fastifyWebsocket from "@fastify/websocket";
import Fastify from "fastify";

import fastifyCookie from "@fastify/cookie";
import { discoverHandlers } from "./decorator/handler.discovery";
import { registerRoutes } from "./decorator/route.decorator";
import { registerWebSocketHandlers } from "./decorator/websocket.decorator";
import errorHandler from "./error/errorHandler";
import jwtPlugin from "./plugins/jwt"; //
import { AppLogger } from "./utils/AppLogger";

AppDataSource.initialize()
    .then(() => {
        console.log(`Database connected to ${env.MYSQL_DATABASE} at ${env.DATABASE_HOST}:${env.DATABASE_PORT}`);
        console.log(
            "Entities:",
            AppDataSource.entityMetadatas.map((meta: { name: string }) => meta.name)
        );
    })
    .catch((err: Error) => console.error("Error during Data Source initialization", err));

const port = 3001;
const fastify = Fastify({ logger: true, ajv: { customOptions: { allErrors: true, $data: true } } });
AppLogger.initialize(fastify.log);
fastify.setErrorHandler(errorHandler);
fastify.register(fastifyCookie);
fastify.register(jwtPlugin);
fastify.register(fastifyWebsocket);

// Log incoming request payloads
if (!env.IsProd) {
    fastify.addHook("preHandler", async (request, reply) => {
        request.log.info({ body: request.body }, "Incoming request payload");
    });
}

// Discover and register REST and WebSocket handlers
const handlers = discoverHandlers(path.join(__dirname, "./features"));

registerRoutes(fastify, handlers);
registerWebSocketHandlers(fastify, handlers);

console.error("errorHandler", fastify.errorHandler);
// Start the server :)
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`BFF is running at address ${address}`);
});
