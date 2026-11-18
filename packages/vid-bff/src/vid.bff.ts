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
import { UPLOAD_CHUNK_BYTES } from "@vid/common";
import Fastify from "fastify";
import path from "path";
import { castGroupService } from "./cast/cast-group.service";
import { castService } from "./cast/cast.service";
import { homeVideoService } from "./home-video/home-video.service";
import { movieService } from "./movie/movie.service";
import { playlistService } from "./playlist/playlist.service";
import { uploadService } from "./upload/upload.service";
import { VideoServerWebSocketManager } from "./ws/VideoServerWebSocketManager";

const fastify = Fastify({ logger: { level: process.env.LOG_LEVEL ?? "info" } });
AppLogger.initialize(fastify.log);
fastify.setErrorHandler(errorHandler);
fastify.register(fastifyWebsocket);
fastify.register(fastifyCookie);
fastify.register(jwtPlugin);
// An upload chunk is handed to the route as the raw stream, so it is written to the disk and not held in memory. Only this
// content type may be larger than the 1 MB that Fastify takes by default.
fastify.addContentTypeParser("application/octet-stream", { bodyLimit: UPLOAD_CHUNK_BYTES }, (_req, payload, done) => done(null, payload));

HandlerRegistry.discoverHandlers([path.join(__dirname, "./controllers"), path.join(__dirname, "./handlers")]);

registerRoutes({ fastify, controllers: Array.from(HandlerRegistry.getRestHandlers()) });

registerLocalWebSocketHandlers({
    fastify,
    handlers: Array.from(HandlerRegistry.getWsHandlers()),
    wsManager: VideoServerWebSocketManager.getInstance(),
});

onShutdown(() => homeVideoService.flush());
onShutdown(() => movieService.flush());
onShutdown(() => playlistService.flush());
onShutdown(() => castGroupService.flush());
onShutdown(async () => castService.stop());
void castService.start();
void homeVideoService.load();
void movieService.load();
void playlistService.load();
void uploadService.start();
void castGroupService.load();

const port = 3051;

fastify.listen({ port, host: "0.0.0.0" }, (err, address) => {
    if (err) throw err;
    console.log(`VID BFF is running at address ${address}`);
});
