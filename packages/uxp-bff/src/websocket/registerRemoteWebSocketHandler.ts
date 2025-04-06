import { ACCESS_TOKEN, AppLogger, createErrorMessageResponse, Token } from "@uxp/bff-common";
import { buildPath, ErrorCodes, ErrorDetail, GenericWebSocketResponse } from "@uxp/common";
import { FastifyInstance, FastifyRequest } from "fastify";
import { DataSource } from "typeorm";
import { RawData, WebSocket } from "ws";
import { AppEntity } from "../db/entities/AppEntity";

const MAX_CONNECT_ATTEMPTS = 3;
const MAX_RECONNECT_ATTEMPTS = 5;

const RETRY_DELAY = 3000;

const activeSessions = new Map<string, Set<WebSocket>>();

export function registerRemoteWebSocketHandler({ fastify: app, dataSource }: { fastify: FastifyInstance; dataSource: DataSource }) {
    app.register(async function (fastify) {
        fastify.get("/ws-api/:appid", { websocket: true }, async (clientSocket, request) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const appId = (request.params as any)?.appid;
            const app = await getRemoteApp(dataSource, appId);

            if (!app) {
                return sendErrorAndClose(clientSocket, request, `uxp/remote_action`,
                    {
                        code: ErrorCodes.NOT_FOUND,
                        message: `Remote app ${appId} not found`
                    }
                );
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
                return sendErrorAndClose(clientSocket, request, `uxp/remote_action`,
                    {
                        code: ErrorCodes.UNAUTHORIZED,
                        message: `Unauthorized access`,
                    }
                );

            }

            const remoteSocket = await connectToRemoteApp(request, app, MAX_CONNECT_ATTEMPTS);
            if (!remoteSocket) {
                return sendErrorAndClose(clientSocket, request, `uxp/remote_action`,
                    {
                        code: ErrorCodes.INTERNAL_SERVER_ERROR,
                        message: `Failed to connect to remote WebSocket`,
                    }
                );
            }
            if (user?.sessionId) {
                if (!activeSessions.has(user.sessionId)) {
                    activeSessions.set(user.sessionId, new Set());
                }
                activeSessions.get(user.sessionId)!.add(clientSocket);
            }

            return setupWebSocketProxy(clientSocket, remoteSocket, request, app);
        });
    });
}

export const closeAllActiveWebSockets = (sessionId: string) => {
    const sockets = activeSessions.get(sessionId);
    if (!sockets || sockets.size === 0) return;

    const socketsToClose = [...sockets];
    socketsToClose.forEach(socket => {
        closeSocket(socket);
    });
    activeSessions.delete(sessionId);
}

const getRemoteApp = async (dataSource: DataSource, appid: string) => {
    if (!appid) return null;
    return dataSource.getRepository(AppEntity).findOneBy({ name: appid });
};

const getClientIp = (request: FastifyRequest) => {
    const realIp = request.ip || "";
    const existingForwardedFor = request.headers["x-forwarded-for"];
    return existingForwardedFor
        ? `${existingForwardedFor}, ${realIp}`  // Append real IP to existing list
        : realIp
}

const sendErrorAndClose = (socket: WebSocket, request: FastifyRequest, action: string, errorDetail: ErrorDetail) => {
    socket.send(
        createErrorMessageResponse(request, action, errorDetail, undefined)
    );
    closeSocket(socket);
};


const connectToRemoteApp = async (request: FastifyRequest, app: AppEntity, maxRetries = MAX_CONNECT_ATTEMPTS): Promise<WebSocket | null> => {
    const wsurl = buildPath(app.baseUrl, app.config.contextPath, app.config.wsPath ?? "/ws-api");
    let attempt = 0;
    while (attempt < maxRetries) {

        AppLogger.info(request, { message: `Connecting to remote WebSocket: ${wsurl}` });

        const ws = new WebSocket(wsurl, {
            headers: {
                cookie: request.headers.cookie,
                "user-agent": request.headers["user-agent"],
                "x-forwarded-for": getClientIp(request)
            }
        });
        try {
            const connectedSocket = await new Promise<WebSocket>((resolve, reject) => {
                const onError = (error: Error) => {
                    AppLogger.error(request, { message: "Remote WebSocket connection error", error });
                    ws.off("open", onOpen);
                    ws.off("close", onClose);
                    ws.close();
                    reject(null);
                }
                const onClose = () => {
                    AppLogger.warn(request, { message: `Remote WebSocket closed during connection attempt` });
                    ws.off("error", onError);
                    ws.off("open", onOpen);
                    reject(null);
                }
                const onOpen = () => {
                    AppLogger.info(request, { message: `Connected to remote WebSocket: ${wsurl}` });
                    ws.off("error", onError);
                    ws.off("close", onClose);
                    resolve(ws);
                }
                ws.once("open", onOpen);

                ws.once("error", onError);

                ws.once("close", onClose);
            });
            return connectedSocket;
        } catch (error) {
            AppLogger.error(request, { message: `WebSocket connection attempt ${attempt + 1} failed`, error });
        }

        attempt++;
        if (attempt < maxRetries) {
            AppLogger.warn(request, { message: `Retrying WebSocket connection... (${attempt}/${maxRetries})` });
            await new Promise((res) => setTimeout(res, RETRY_DELAY)); // Wait before retrying
        }
    }

    AppLogger.error(request, { message: "Max WebSocket connection attempts reached" });
    return null;
};


const createMessageForwarding = (sourceSocket: WebSocket, targetSocket: WebSocket) => {
    return (message: RawData, isBinary: boolean) => {
        if (targetSocket.readyState === WebSocket.OPEN) {
            targetSocket.send(isBinary ? message : message.toString());
        }
    };
};
const closeSocket = (socket: WebSocket) => {
    if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
    }
}

async function reconnectRemoteSocket(request: FastifyRequest, app: AppEntity, clientSocket: WebSocket, maxRetries = MAX_RECONNECT_ATTEMPTS) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (clientSocket.readyState !== WebSocket.OPEN) {
            AppLogger.warn(request, { message: `Client socket also closed stopping reconnection attemtps` });
            break;
        }
        AppLogger.warn(request, { message: `Reconnecting to remote WebSocket (attempt ${attempt}/${maxRetries})` });
        const newSocket = await connectToRemoteApp(request, app, 1);

        if (newSocket) return newSocket;

        await new Promise((res) => setTimeout(res, RETRY_DELAY * attempt));
    }

    AppLogger.error(request, { message: "Failed to reconnect to remote WebSocket after multiple attempts" });
    closeSocket(clientSocket);
    return null;
}
const removeSocketFromActiveSessions = (request: FastifyRequest, clientSocket: WebSocket) => {
    const user = request.user as Token | undefined;
    if (user?.sessionId) {
        const sessionId = user.sessionId;
        activeSessions.get(sessionId)?.delete(clientSocket);
        if (activeSessions.get(sessionId)?.size === 0) {
            activeSessions.delete(sessionId);
        }
    }
}

const setupPingPong = (socket: WebSocket, request: FastifyRequest, socketType: "client" | "remote") => {
    const PONG_TIMEOUT = 10000; // Wait max 10s for pong response
    let pongReceived = true;
    let pongTimeout: NodeJS.Timeout | undefined = undefined;

    const clearPong = () => {
        clearTimeout(pongTimeout);
        pongTimeout = undefined;
    }

    const ping = () => {
        if (socket.readyState === WebSocket.OPEN) {
            pongReceived = false;
            AppLogger.debug(request, { message: `Sending ping to ${socketType} WebSocket` });
            socket.ping();
            pongTimeout = setTimeout(() => {
                if (!pongReceived) {
                    AppLogger.warn(request, { message: `WebSocket ${socketType} unresponsive, closing connection` });
                    closeSocket(socket);
                }
            }, PONG_TIMEOUT);
        }
    }
    socket.on("pong", () => {
        AppLogger.debug(request, { message: `Received pong from ${socketType} WebSocket` });
        pongReceived = true;
        clearPong();
    });

    return {
        socket,
        ping,
        clearPong
    };

}
const CLIENT = 0, REMOTE = 1;

function setupWebSocketProxy(clientSocket: WebSocket, remoteSocket: WebSocket, request: FastifyRequest, app: AppEntity) {
    const PING_INTERVAL = 30000; // Ping every 30 seconds
    const sockets = [setupPingPong(clientSocket, request, "client"), setupPingPong(remoteSocket, request, "remote")];

    const messageHandlers = {
        clientToRemote: createMessageForwarding(sockets[CLIENT].socket, sockets[REMOTE].socket),
        remoteToClient: createMessageForwarding(sockets[REMOTE].socket, sockets[CLIENT].socket),
    };

    const sendPing = () => {
        sockets.forEach(socket => socket.ping());
    };

    const pingInterval = setInterval(sendPing, PING_INTERVAL);

    const stopMessageForwarding = () => {
        const [client, remote] = sockets;
        AppLogger.debug(request, { message: "Stopping message forwarding" });
        client.socket.off("message", messageHandlers.clientToRemote);
        remote.socket.off("message", messageHandlers.remoteToClient);
    }
    const startMessageForwarding = () => {
        AppLogger.debug(request, { message: "Starting message forwarding" });
        const [client, remote] = sockets;
        remote.socket.on("message", messageHandlers.remoteToClient);
        client.socket.on("message", messageHandlers.clientToRemote);
    }
    const onRemoteError = (error: Error) => {
        AppLogger.error(request, { message: "Remote WebSocket error", error });
        if (isFatalWebSocketError(error)) {
            closeSockets();
        }
    }
    const onClientError = (error: Error) => {
        AppLogger.error(request, { message: "Client WebSocket error", error });
        if (isFatalWebSocketError(error)) {
            closeSockets();
        }
    }

    function closeSockets() {
        AppLogger.debug(request, { message: "Closing WebSocket connections" });
        clearInterval(pingInterval);
        removeSocketFromActiveSessions(request, sockets[CLIENT].socket);
        sockets.forEach(socket => {
            socket.clearPong();
            socket.socket.removeAllListeners();
            closeSocket(socket.socket);
        });

        sockets.length = 0;
    }
    const remoteClose = async () => {
        AppLogger.warn(request, { message: "Remote WebSocket closed, attempting reconnection" });
        const [client, remote] = sockets;
        remote.clearPong();
        stopMessageForwarding();

        if (client.socket.readyState === WebSocket.OPEN) {

            client.socket.send(
                createErrorMessageResponse(request, "uxp/remote_connection", {
                    code: ErrorCodes.INTERNAL_SERVER_ERROR,
                    message: "Remote WebSocket closed",
                }, undefined)
            );

            const newRemoteSocket = await reconnectRemoteSocket(request, app, client.socket);
            if (!newRemoteSocket) {
                closeSockets();
                return;
            }
            client.socket.send(
                JSON.stringify({
                    success: true,
                    action: "uxp/remote_connection",
                }));
            sockets[REMOTE].socket.removeAllListeners();
            const newRemote = setupPingPong(newRemoteSocket, request, "remote");
            newRemote.socket.on("error", onRemoteError);
            sockets[REMOTE] = newRemote;
            messageHandlers.clientToRemote = createMessageForwarding(client.socket, newRemote.socket);
            messageHandlers.remoteToClient = createMessageForwarding(newRemote.socket, client.socket);
            newRemote.socket.on("close", remoteClose);
            startMessageForwarding();
        } else {
            closeSockets();
        }

    }

    sockets[CLIENT].socket.on("close", closeSockets);
    sockets[REMOTE].socket.on("close", remoteClose)

    sockets[CLIENT].socket.on("error", onClientError);
    sockets[REMOTE].socket.on("error", onRemoteError);
    startMessageForwarding();

}

function isFatalWebSocketError(error: any): boolean {
    if (!error || !error.message) return false;
    const fatalErrors = ["ECONNRESET", "EPIPE", "ECONNREFUSED", "Network is down", "TLS handshake failed"];
    return fatalErrors.some((fatalError) => error.message.includes(fatalError));
}
