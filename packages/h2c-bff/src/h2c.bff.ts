import env from "./env";
import fastifyCookie from "@fastify/cookie";
import { AppLogger, errorHandler, HandlerRegistry, IsProd, jwtPlugin, registerRoutes } from "@uxp/bff-common";
import Fastify from "fastify";
import path from "path";
import "@uxp/bff-common/dist/health/health.controller";

const { AppDataSource } = require("./db/typeorm.config");

AppDataSource.initialize()
    .then(() => {
        console.log(`Database connected to ${env.MYSQL_H2C_DATABASE} at ${env.DATABASE_HOST}:${env.DATABASE_PORT}`);
        console.log(
            "Entities:",
            AppDataSource.entityMetadatas.map((meta: { name: string }) => meta.name)
        );
    })
    .catch((err: Error) => console.error("Error during Data Source initialization", err));

const fastify = Fastify({ logger: true, ajv: { customOptions: { allErrors: true, $data: true } } });
AppLogger.initialize(fastify.log);
fastify.setErrorHandler(errorHandler);
fastify.register(fastifyCookie);
fastify.register(jwtPlugin);

if (!IsProd) {
    fastify.addHook("preHandler", async (request, reply) => {
        request.log.info({ body: request.body }, "Incoming request payload");
    });
}

HandlerRegistry.discoverHandlers(path.join(__dirname, "./controllers"));
const restHandlers = HandlerRegistry.getRestHandlers();

console.log("restHandlers", restHandlers);

registerRoutes({
    fastify,
    controllers: Array.from(restHandlers),
});

const port = 3011;

fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`BFF is running at address ${address}`);
});
