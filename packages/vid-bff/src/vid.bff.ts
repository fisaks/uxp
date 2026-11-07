import "./env";
import fastifyCookie from "@fastify/cookie";
import { AppLogger, errorHandler, HandlerRegistry, jwtPlugin, onShutdown, registerRoutes } from "@uxp/bff-common";
import Fastify from "fastify";
import path from "path";
import { homeVideoService } from "./home-video/home-video.service";

const fastify = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });
AppLogger.initialize(fastify.log);
fastify.setErrorHandler(errorHandler);
fastify.register(fastifyCookie);
fastify.register(jwtPlugin);

HandlerRegistry.discoverHandlers([path.join(__dirname, "./controllers")]);

registerRoutes({ fastify, controllers: Array.from(HandlerRegistry.getRestHandlers()) });

onShutdown(() => homeVideoService.flush());
void homeVideoService.load();

const port = 3051;

fastify.listen({ port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`VID BFF is running at address ${address}`);
});
