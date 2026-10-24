import "./env";
import fastifyCookie from "@fastify/cookie";
import { AppLogger, errorHandler, HandlerRegistry, jwtPlugin, registerRoutes } from "@uxp/bff-common";
import Fastify from "fastify";
import path from "path";

const fastify = Fastify({ logger: { enabled: true, level: process.env.LOG_LEVEL ?? "info" } });
AppLogger.initialize(fastify.log);
fastify.setErrorHandler(errorHandler);
fastify.register(fastifyCookie);
fastify.register(jwtPlugin);

HandlerRegistry.discoverHandlers([path.join(__dirname, "./controllers")]);

registerRoutes({
    fastify,
    controllers: Array.from(HandlerRegistry.getRestHandlers()),
});

const port = 3041;

fastify.listen({ port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`AUD BFF is running at address ${address}`);
});
