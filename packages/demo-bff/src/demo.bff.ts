import fastifyCookie from "@fastify/cookie";
import { AppLogger, errorHandler, HandlerRegistry, jwtPlugin, registerRoutes } from "@uxp/bff-common";
import Fastify from "fastify";
import path from "path";
import "./env";

const fastify = Fastify({ logger: true });
AppLogger.initialize(fastify.log);
fastify.setErrorHandler(errorHandler);
fastify.register(fastifyCookie);
fastify.register(jwtPlugin);

// Log incoming request payloads

fastify.addHook("preHandler", async (request, reply) => {
    request.log.info({ body: request.body }, "Incoming request payload");
});

HandlerRegistry.discoverHandlers(path.join(__dirname, "./controllers"));
const restHandlers = HandlerRegistry.getRestHandlers();

console.log("restHandlers", restHandlers);

registerRoutes({
    fastify,
    controllers: Array.from(restHandlers),
});

const port = 3021;

fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`BFF is running at address ${address}`);
});
