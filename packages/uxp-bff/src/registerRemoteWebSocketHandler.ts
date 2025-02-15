import { ACCESS_TOKEN, AppLogger, createErrorMessageResponse, Token } from "@uxp/bff-common";
import { buildPath, ErrorCodes } from "@uxp/common";
import { FastifyInstance, FastifyRequest } from "fastify";
import { DataSource } from "typeorm";
import { WebSocket } from "ws";
import { AppEntity } from "./db/entities/AppEntity";

export function registerRemoteWebSocketHandler({ fastify: app, dataSource }: { fastify: FastifyInstance; dataSource: DataSource }) {
    app.register(async function (fastify) {
        fastify.get("/ws-api/:appid", { websocket: true }, async (clientSocket, request) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const appId = (request.params as any)?.appid;
            const app = await getRemoteApp(dataSource, appId);

            if (!app) {
                clientSocket.send(
                    createErrorMessageResponse(request, `${appId}/remote_action`, {
                        code: ErrorCodes.NOT_FOUND,
                        message: `Remote app ${appId} not found`,
                    }, undefined)
                );
                clientSocket.close();
                return;
            }

            let user: Token | undefined;

            // Authentication Check
            if (request.cookies[ACCESS_TOKEN]) {
                try {
                    await request.jwtVerify();
                    user = request.user as Token;
                } catch (err) {
                    AppLogger.warn(request, { message: "Failed to verify WebSocket token", error: err });
                }
            }

            if (!user && !app.config.wsPublic) {
                clientSocket.send(
                    createErrorMessageResponse(request, `${appId}/remote_action`, {
                        code: ErrorCodes.UNAUTHORIZED,
                        message: `Unauthorized access`,

                    }, undefined)
                );
                clientSocket.close();
                return;
            }

            const remoteSocket = await connectToRemoteApp(request, app, 3);
            if (!remoteSocket) {
                clientSocket.send(
                    createErrorMessageResponse(request, `${appId}/remote_action`, {
                        code: ErrorCodes.INTERNAL_SERVER_ERROR,
                        message: `Failed to connect to remote WebSocket`,
                    }, undefined)
                );
                clientSocket.close();
                return;
            }

            setupWebSocketProxy(clientSocket, remoteSocket, request);
            return;
        });
    });
}

const getRemoteApp = async (dataSource: DataSource, appid: string) => {
    return dataSource.getRepository(AppEntity).findOneBy({ name: appid });
};
const getClientIp = (request: FastifyRequest) => {
    const realIp = request.ip || "";
    const existingForwardedFor = request.headers["x-forwarded-for"];
    return existingForwardedFor
        ? `${existingForwardedFor}, ${realIp}`  // Append real IP to existing list
        : realIp
}
const connectToRemoteApp = async (request: FastifyRequest, app: AppEntity, maxRetries = 3): Promise<WebSocket | null> => {
    const { baseUrl } = app;
    const { contextPath,wsPath} = app.config;
    const wsurl = buildPath(baseUrl, contextPath, wsPath ?? "/ws-api");
    let attempt = 0;
    while (attempt < maxRetries) {
        try {
            AppLogger.info(request, { message: `Connecting to remote WebSocket: ${wsurl}` });

            const ws = new WebSocket(wsurl, {
                headers: {
                    cookie: request.headers.cookie,
                    "user-agent": request.headers["user-agent"],
                    "x-forwarded-for": getClientIp(request)
                }
            });
            return new Promise((resolve, reject) => {
                ws.once("open", () => {
                    AppLogger.info(request, { message: `Connected to remote WebSocket: ${wsurl}` });
                    resolve(ws);
                });

                ws.once("error", (error) => {
                    AppLogger.error(request, { message: "Remote WebSocket connection error", error });
                    ws.close();
                    reject(null);
                });

                ws.once("close", () => {
                    AppLogger.warn(request, { message: `Remote WebSocket closed during connection attempt` });
                    reject(null);
                });
            });
        } catch (error) {
            AppLogger.error(request, { message: `WebSocket connection attempt ${attempt + 1} failed`, error });
        }

        attempt++;
        if (attempt < maxRetries) {
            AppLogger.warn(request, { message: `Retrying WebSocket connection... (${attempt}/${maxRetries})` });
            await new Promise((res) => setTimeout(res, 3000)); // Wait before retrying
        }
    }

    AppLogger.error(request, { message: "Max WebSocket connection attempts reached" });
    return null;
};

function setupWebSocketProxy(clientSocket: WebSocket, remoteSocket: WebSocket, request: FastifyRequest) {
    const PING_INTERVAL = 30000; // Ping every 30 seconds
    const PONG_TIMEOUT = 10000; // Wait max 10s for pong response
    let remotePongReceived = true;
    let clientPongReceived = true;
    let remotePongTimeout: NodeJS.Timeout | null = null;
    let clientPongTimeout: NodeJS.Timeout | null = null;

    const sendPing = () => {
        if (remoteSocket.readyState === WebSocket.OPEN) {
            remotePongReceived = false;
            remoteSocket.ping();
            remotePongTimeout = setTimeout(() => {
                if (!remotePongReceived) {
                    AppLogger.warn(request, { message: "Remote WebSocket unresponsive, closing connection" });
                    remoteSocket.close();
                }
            }, PONG_TIMEOUT);
        }

        if (clientSocket.readyState === WebSocket.OPEN) {
            clientPongReceived = false;
            clientSocket.ping();
            clientPongTimeout = setTimeout(() => {
                if (!clientPongReceived) {
                    AppLogger.warn(request, { message: "Client WebSocket unresponsive, closing connection" });
                    clientSocket.close();
                }
            }, PONG_TIMEOUT);
        }
    };

    const pingInterval = setInterval(sendPing, PING_INTERVAL);
    remoteSocket.on("pong", () => {
        remotePongReceived = true;
        if (remotePongTimeout) clearTimeout(remotePongTimeout);
    });

    clientSocket.on("pong", () => {
        clientPongReceived = true;
        if (clientPongTimeout) clearTimeout(clientPongTimeout);
    });

    remoteSocket.on("message", (message, isBinary) => {
        if (clientSocket.readyState === WebSocket.OPEN) {
            clientSocket.send(isBinary ? message : message.toString());
        }
    });

    clientSocket.on("message", (message, isBinary) => {
        if (remoteSocket.readyState === WebSocket.OPEN) {
            remoteSocket.send(isBinary ? message : message.toString());
        }
    });

    function closeSockets() {
        clearInterval(pingInterval);
        if (remotePongTimeout) clearTimeout(remotePongTimeout);
        if (clientPongTimeout) clearTimeout(clientPongTimeout);
        if (remoteSocket.readyState === WebSocket.OPEN) remoteSocket.close();
        if (clientSocket.readyState === WebSocket.OPEN) clientSocket.close();
    }

    remoteSocket.on("close", closeSockets);
    clientSocket.on("close", closeSockets);

    remoteSocket.on("error", (error) => {
        AppLogger.error(request, { message: "Remote WebSocket error", error });
        if (isFatalWebSocketError(error)) {
            closeSockets();
        }
    });

    clientSocket.on("error", (error) => {
        AppLogger.error(request, { message: "Client WebSocket error", error });
        if (isFatalWebSocketError(error)) {
            closeSockets();
        }
    });
}

function isFatalWebSocketError(error: any): boolean {
    if (!error || !error.message) return false;

    const fatalErrors = [
        "ECONNRESET",
        "EPIPE",
        "ECONNREFUSED",
        "Network is down",
        "TLS handshake failed",
    ];

    return fatalErrors.some((fatalError) => error.message.includes(fatalError));
}