import fastifyCookie from "@fastify/cookie";
import fastifyMultipart from "@fastify/multipart";
import fastifyWebsocket from "@fastify/websocket";
import { AppLogger, errorHandler, HandlerRegistry, IsProd, jwtPlugin, registerLocalWebSocketHandlers, registerRoutes } from "@uxp/bff-common";
import "@uxp/bff-common/dist/health/health.controller";
import Fastify from "fastify";
import path from "path";
import env from "./env";
import { H2CAppServerWebSocketManager } from "./ws/H2CAppServerWebSocketManager";
import { DateTime } from "luxon";

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

const fastify = Fastify({ 
    logger: {
        enabled: true,
        level: env.LOG_LEVEL ?? "info",
        timestamp: () => `,"time":"${DateTime.now().setZone(env.TZ ?? "UTC").toISO()}"`,
        formatters: {
            level: (label) => ({ level: label.toUpperCase() }),
        },
    }
    , ajv: { customOptions: { allErrors: true, $data: true } } });
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

if (!IsProd) {
    fastify.addHook("preHandler", async (request, _reply) => {
        request.log.info({ body: request.body }, "Incoming request payload");
    });
}

HandlerRegistry.discoverHandlers([path.join(__dirname, "./controllers"), path.join(__dirname, "./handlers")]);
const restHandlers = HandlerRegistry.getRestHandlers();
const wsHandlers = HandlerRegistry.getWsHandlers();

console.log("restHandlers", restHandlers);
console.log("wsHandlers", wsHandlers);

const wsManager = H2CAppServerWebSocketManager.getInstance()

registerLocalWebSocketHandlers({
    fastify,
    handlers: Array.from(wsHandlers),
    wsManager,
    dataSource: AppDataSource
});

registerRoutes({
    fastify,
    dataSource: AppDataSource,
    controllers: Array.from(restHandlers),
});

const port = 3011;

fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`BFF is running at address ${address}`);
});
