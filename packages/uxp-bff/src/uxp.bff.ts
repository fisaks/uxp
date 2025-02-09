process.env.TZ = "UTC";

import fastifyWebsocket from "@fastify/websocket";
import Fastify, { FastifyRequest } from "fastify";
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
    registerLocalWebSocketHandlers,
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
    disableRequestLogging: true,
    ajv: { customOptions: { allErrors: true, $data: true, keywords: [ValidateGlobalConfigValue], coerceTypes: true } },
});
AppLogger.initialize(fastify.log);
fastify.setErrorHandler(errorHandler);
fastify.register(fastifyCookie);
fastify.register(jwtPlugin);
fastify.register(fastifyWebsocket);
declare module "fastify" {
    interface FastifyRequest {
        uxpRaw?: boolean;
    }
}
 // eslint-disable-next-line @typescript-eslint/no-explicit-any
function setRaw(req: FastifyRequest, _payload: any, done: any) {
    req["uxpRaw"] = true;
    done();
}
fastify.addContentTypeParser("multipart/form-data", setRaw);
// Log incoming request payloads
if (!IsProd) {
    fastify.addHook("preHandler", async (request, _reply) => {
        if (request.uxpRaw) {
            AppLogger.info(request, { message: "Request is raw data", object: { url: request.url, method: request.method } });
        } else {
            AppLogger.info(request, { message: "Incoming request payload", object: request.body as Record<string, unknown> });
        }
    });
    fastify.addHook("onResponse", (request, reply) => {
        AppLogger.info(request, { message: "Response", object: { url: request.url, method: request.method, status: reply.status } });
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
registerLocalWebSocketHandlers({
    fastify,
    dataSource: AppDataSource,
    handlers: Array.from(wsHandlers),
});

// Start the server :)
fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`BFF is running at address ${address}`);
});
