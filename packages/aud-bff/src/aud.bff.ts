import "./env";
import fastifyCookie from "@fastify/cookie";
import fastifyWebsocket from "@fastify/websocket";
import { AppLogger, errorHandler, HandlerRegistry, jwtPlugin, registerLocalWebSocketHandlers, registerRoutes } from "@uxp/bff-common";
import Fastify from "fastify";
import path from "path";
import { libraryService } from "./library/library.service";
import { AudioServerWebSocketManager } from "./ws/AudioServerWebSocketManager";

const fastify = Fastify({ logger: { enabled: true, level: process.env.LOG_LEVEL ?? "info" } });
AppLogger.initialize(fastify.log);
fastify.setErrorHandler(errorHandler);
fastify.register(fastifyWebsocket);
fastify.register(fastifyCookie);
fastify.register(jwtPlugin);

HandlerRegistry.discoverHandlers([path.join(__dirname, "./controllers"), path.join(__dirname, "./handlers")]);

registerRoutes({ fastify, controllers: Array.from(HandlerRegistry.getRestHandlers()) });

registerLocalWebSocketHandlers({
    fastify,
    handlers: Array.from(HandlerRegistry.getWsHandlers()),
    wsManager: AudioServerWebSocketManager.getInstance(),
});

const port = 3041;

fastify.listen({ port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`AUD BFF is running at address ${address}`);
    void libraryService.start();
});
