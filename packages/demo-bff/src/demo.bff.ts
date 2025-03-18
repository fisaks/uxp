import fastifyCookie from "@fastify/cookie";
import fastifyMultipart from "@fastify/multipart";
import fastifyWebsocket from "@fastify/websocket";
import { AppLogger, errorHandler, HandlerRegistry, jwtPlugin, registerLocalWebSocketHandlers, registerRoutes } from "@uxp/bff-common";
import Fastify from "fastify";
import path from "path";
import "./env";
import { DemoAppServerWebSocketManager } from "./ws/DemoAppServerWebSocketManager";


const fastify = Fastify({ logger: { enabled: true, level: process.env.LOG_LEVEL ?? "info" } });
AppLogger.initialize(fastify.log);
fastify.setErrorHandler(errorHandler);
fastify.register(fastifyWebsocket,);
fastify.register(fastifyCookie);
fastify.register(jwtPlugin);
fastify.register(fastifyMultipart, {
    limits: {
        fieldNameSize: 100, // Max field name size in bytes
        fieldSize: 100, // Max field value size in bytes
        fields: 10, // Max number of non-file fields
        fileSize: 10000000, // For multipart forms, the max file size in bytes
        files: 10, // Max number of file fields
        headerPairs: 2000, // Max number of header key=>value pairs
        parts: 20, // For multipart forms, the max number of parts (fields + files)
    },
});

// Log incoming request payloads

fastify.addHook("preHandler", async (request, _reply) => {
    request.log.info({ body: request.body }, "Incoming request payload");
});

HandlerRegistry.discoverHandlers([path.join(__dirname, "./controllers"), path.join(__dirname, "./handlers")]);
const restHandlers = HandlerRegistry.getRestHandlers();


const wsHandlers = HandlerRegistry.getWsHandlers();

console.log("restHandlers", restHandlers);
console.log("wsHandlers", wsHandlers);
const wsManager = DemoAppServerWebSocketManager.getInstance()

registerLocalWebSocketHandlers({
    fastify,
    handlers: Array.from(wsHandlers),
    wsManager
});

registerRoutes({
    fastify,
    controllers: Array.from(restHandlers),
});



const port = 3021;

fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`BFF is running at address ${address}`);
});
