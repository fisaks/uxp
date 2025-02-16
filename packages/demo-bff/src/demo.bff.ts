import fastifyCookie from "@fastify/cookie";
import fastifyWebsocket from "@fastify/websocket";
import { AppLogger, errorHandler, HandlerRegistry, jwtPlugin, registerLocalWebSocketHandlers, registerRoutes } from "@uxp/bff-common";
import Fastify from "fastify";
import path from "path";
import "./env";


const fastify = Fastify({ logger: { enabled: true, level: process.env.LOG_LEVEL ?? "info" } });
AppLogger.initialize(fastify.log);
fastify.setErrorHandler(errorHandler);
fastify.register(fastifyWebsocket,);
fastify.register(fastifyCookie);
fastify.register(jwtPlugin);

// Log incoming request payloads

fastify.addHook("preHandler", async (request, _reply) => {
    request.log.info({ body: request.body }, "Incoming request payload");
});

HandlerRegistry.discoverHandlers([path.join(__dirname, "./controllers"), path.join(__dirname, "./handlers")]);
const restHandlers = HandlerRegistry.getRestHandlers();

console.log("restHandlers", restHandlers);
const wsHandlers = HandlerRegistry.getWsHandlers();

console.log("restHandlers", restHandlers);
console.log("wsHandlers", wsHandlers);

registerLocalWebSocketHandlers({
    fastify,
    handlers: Array.from(wsHandlers),
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
