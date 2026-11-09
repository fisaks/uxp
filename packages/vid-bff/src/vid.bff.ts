import "./env";
import fastifyCookie from "@fastify/cookie";
import fastifyWebsocket from "@fastify/websocket";
import {
    AppLogger,
    errorHandler,
    HandlerRegistry,
    jwtPlugin,
    onShutdown,
    registerLocalWebSocketHandlers,
    registerRoutes,
} from "@uxp/bff-common";
import Fastify from "fastify";
import path from "path";
import { castService } from "./cast/cast.service";
import { homeVideoService } from "./home-video/home-video.service";
import { VideoServerWebSocketManager } from "./ws/VideoServerWebSocketManager";

const fastify = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });
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
    wsManager: VideoServerWebSocketManager.getInstance(),
});

onShutdown(() => homeVideoService.flush());
onShutdown(async () => castService.stop());
castService.start();
void homeVideoService.load();

const port = 3051;

fastify.listen({ port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`VID BFF is running at address ${address}`);
});
