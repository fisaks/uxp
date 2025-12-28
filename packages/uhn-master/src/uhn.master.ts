import fastifyCookie from "@fastify/cookie";
import fastifyMultipart from "@fastify/multipart";
import fastifyWebsocket from "@fastify/websocket";
import { AppLogger, errorHandler, HandlerRegistry, IsProd, jwtPlugin, registerLocalWebSocketHandlers, registerRoutes } from "@uxp/bff-common";
import "@uxp/bff-common/dist/health/health.controller";
import Fastify from "fastify";
import { DateTime } from "luxon";
import path from "path";
import env from "./env";

import "./services/blueprint-resource.service";
import { startBlueprintRuntimeSupervisorServices } from "./services/blueprint-runtime-supervisor.service";
import mqttService from "./services/mqtt.service";

import { setupWebDispatchers } from "./dispatchers";
import { UHNAppServerWebSocketManager } from "./ws/UHNAppServerWebSocketManager";

const { AppDataSource } = require("./db/typeorm.config");


AppDataSource.initialize()
    .then(async () => {
        console.log(`Database connected to ${env.MYSQL_UHN_DATABASE} at ${env.DATABASE_HOST}:${env.DATABASE_PORT}`);
        console.log(
            "Entities:",
            AppDataSource.entityMetadatas.map((meta: { name: string }) => meta.name)
        );
        await startBlueprintRuntimeSupervisorServices();
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
    , ajv: { customOptions: { allErrors: true, $data: true } }
});
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
// "Touch" mqttService so it gets loaded on startup
mqttService.isConnected()
console.log("restHandlers", restHandlers);
console.log("wsHandlers", wsHandlers);

const wsManager = UHNAppServerWebSocketManager.getInstance()

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
setupWebDispatchers();
const port = 3031;

fastify.listen({ port: port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`BFF is running at address ${address}`);

});
