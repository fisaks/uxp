import "./env";
import fastifyCookie from "@fastify/cookie";
import fastifyWebsocket from "@fastify/websocket";
import { AppLogger, errorHandler, HandlerRegistry, jwtPlugin, registerLocalWebSocketHandlers, registerRoutes } from "@uxp/bff-common";
import Fastify from "fastify";
import path from "path";
import { audiobookService, libraryService } from "./library/library.service";
import { createLogStream } from "./logging/log-stream";
import { playerService } from "./player/player.service";
import { historyService } from "./history/history.service";
import { playlistService } from "./playlists/playlist.service";
import { AudioServerWebSocketManager } from "./ws/AudioServerWebSocketManager";

// The request lines of Fastify (two per request, and a browser asks for many covers) are only logged when debugging.
const debugging = process.env.LOG_LEVEL === "debug";
const fastify = Fastify({
    disableRequestLogging: !debugging,
    logger: { enabled: true, level: process.env.LOG_LEVEL ?? "info", stream: createLogStream(process.env.AUD_LOKI_URL || undefined) },
});
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

// The playlists and the history are read before the first request, so that none is answered with an empty list.
void Promise.all([playlistService.load(), historyService.load()]).then(() =>
    fastify.listen({ port, host: "0.0.0.0" }, (err, address) => {
        if (err) throw err;
        console.log(`AUD BFF is running at address ${address}`);
        // The queue of before the restart is brought back once the libraries, whose ids it uses, have been read.
        void Promise.all([libraryService.start(), audiobookService.start()]).then(() => playerService.restore());
    })
);
