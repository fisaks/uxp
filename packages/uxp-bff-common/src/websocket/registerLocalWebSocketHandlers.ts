
import { ErrorCodes, GenericWebSocketMessage, GenericWebSocketResponse, MAGIC_BINARY_PREFIX, UserRole } from "@uxp/common";
import Ajv, { ValidateFunction } from "ajv";
import { FastifyInstance, FastifyRequest } from "fastify";
import { DataSource } from "typeorm";
import { WebSocket } from "ws";
import { ACCESS_TOKEN } from "../config/constant";
import { HandlerConstructor } from "../decorator/handler.registry";
import { getUseQueryRunnerOptions, UseQueryRunnerOptions } from "../decorator/queryrunner.decorator";
import { hasRequiredRoles, validateMessagePayload, withQueryRunner } from "../decorator/request-utils";
import { getWebSocketActions, WebSocketActionMetadata } from "../decorator/websocket.decorator";
import { createErrorMessageResponse } from "../error/errorResponse";
import { Token } from "../types/token.types";
import { AppLogger, RequestMetaData } from "../utils/AppLogger";
import { GenericServerWebSocketManager, WebSocketDetails } from "./ServerWebSocketManager";
import { sendWebSocketMessage } from "./websocketUtils";
import { runWithRequestContext } from "../decorator/request-context";
import { AppErrorV2 } from "../error/AppError";


const ajv = new Ajv();
interface WebSocketActionHandler {
    handler: Function;
    validate?: (payload: unknown) => boolean;
    schemaValidate?: ValidateFunction;
    queryRunnerOptions?: UseQueryRunnerOptions | null;
    authenticate: boolean;
    roles: UserRole[];
}

type WebSocketActionMap = Record<string, WebSocketActionHandler>;



type RegisterWebSocketHandlersArgs = {
    fastify: FastifyInstance;
    dataSource?: DataSource;
    handlers: HandlerConstructor[];
    basePath?: string;
    wsManager: GenericServerWebSocketManager
};

/**
 * Register WebSocket handlers with Fastify
 * @param fastify Fastify instance
 * @param handlers Array of handler classes
 */
export function registerLocalWebSocketHandlers({ fastify: app, dataSource, handlers, wsManager, basePath = "/ws-api" }: RegisterWebSocketHandlersArgs) {
    const actionMap = preloadWebSocketHandlers(app, handlers);

    app.register(async function (fastify) {
        fastify.get(basePath, { websocket: true }, async (socket /* WebSocket */, request /* FastifyRequest */) => {
            AppLogger.info(request, { message: `WebSocket connection established (local) ${request.ip}` });

            const socketDetails = await setupWebSocketConnection(wsManager, socket, request);
            if (!socketDetails) {
                AppLogger.error(request, { message: "Failed to setup WebSocket connection no request meta data could be created" });
                socket.close();
                return;
            }
            const cleanupPinPong = setupPingPong(socketDetails);

            socket.on("message", async (message) => handleWebSocketMessage({ actionMap, socketDetails, message, dataSource }));

            socket.on("error", (error) => {
                AppLogger.error(request, { message: "WebSocket error occurred", error });
            });

            socket.on("close", (code, reason) => {
                AppLogger.info(request, { message: `WebSocket closed (code: ${code}, reason: ${reason.toString()})` });
                wsManager.removeUser(socket);
                cleanupPinPong();
            });
        });
    });
}


// Preloaded action map type

function preloadWebSocketHandlers(fastify: FastifyInstance, handlers: any[]): WebSocketActionMap {
    const actionMap: WebSocketActionMap = {};

    handlers.forEach((HandlerClass) => {
        const instance =
            HandlerClass.length > 0 // Constructor has parameters
                ? new HandlerClass(fastify) // Pass the Fastify instance
                : new HandlerClass(); // Instantiate without parameters

        const actions: WebSocketActionMetadata[] = getWebSocketActions(HandlerClass);

        actions.forEach(({ action, validate, schema, handlerName, authenticate, roles }) => {
            AppLogger.info(undefined, {
                message: `WebSocket Action: ${action} => ${HandlerClass.name}.${handlerName}`,
            });
            const schemaValidate = schema ? ajv.compile(schema) : undefined;
            const queryRunnerOptions = getUseQueryRunnerOptions(HandlerClass.prototype, handlerName);

            actionMap[action] = {
                handler: instance[handlerName].bind(instance),
                validate,
                schemaValidate,
                queryRunnerOptions,
                authenticate,
                roles,
            };
        });
    });

    return actionMap;
}

const setupWebSocketConnection = async (wsStore: GenericServerWebSocketManager, socket: WebSocket, request: FastifyRequest) => {

    let user: Token | undefined = undefined;
    if (request.cookies[ACCESS_TOKEN]) {
        try {
            await request.jwtVerify();
            user = request.user as Token;
        } catch (err: unknown) {
            AppLogger.error(request, {
                message: "Failed to verify access token in WebSocket connection",
                error: err,
            });
        }
    }
    const requestMeta = AppLogger.extractMetadata(request);
    if (!requestMeta) {
        return;
    }
    const socketDetails: WebSocketDetails = { socket, user, requestMeta };
    wsStore.addUser(socket, socketDetails);
    return socketDetails;

}
const setupPingPong = (socketDetails: WebSocketDetails) => {
    const { socket, requestMeta, user } = socketDetails
    const PING_INTERVAL = 45000; // Ping every 45s / uxp pings every 30s so we have time to stop this ping if uxp is providing pings
    const PONG_TIMEOUT = 10000; // Wait max 10s for pong
    let pongReceived = true;
    let pongTimeout: NodeJS.Timeout | null = null;
    let pingInterval: NodeJS.Timeout | null = null;
    let stopPing = false;

    const clearPong = () => {
        if (pongTimeout) {
            clearTimeout(pongTimeout);
            pongTimeout = null;
        }
    }
    const clearPing = () => {
        if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
        }

    }
    const stopPingPong = () => {
        if (!stopPing) {
            AppLogger.info(requestMeta, { message: "Received ping from client, stopping automatic pings. UXP is providing pings." });
            stopPing = true;
            clearPing();
            clearPong()
        }
    }
    const cleanUp = () => {
        if (pingInterval || pongTimeout) {
            AppLogger.info(requestMeta, { message: `Cleaning up websocket ping pong` });
        }
        clearPing();
        clearPong();
    }
    const sendPing = () => {
        if (socket.readyState !== socket.OPEN) return;

        pongReceived = false;
        AppLogger.trace(requestMeta, { message: `Sending ping to client` });
        socket.ping();

        // **Set a timeout to check if pong is received in time**
        pongTimeout = setTimeout(() => {
            if (!pongReceived) {
                AppLogger.warn(requestMeta, { message: "Client did not respond to ping. Closing WebSocket." });
                socket.close();
            }
        }, PONG_TIMEOUT);
    };

    pingInterval = setInterval(sendPing, PING_INTERVAL);

    socket.on("pong", () => {
        AppLogger.trace(requestMeta, { message: "Pong received from client" });
        pongReceived = true;
        clearPong()
    });
    socket.on("ping", () => {
        stopPingPong();
        socket.pong();
    })
    return cleanUp;

}
type HandleWebSocketMessageArgs = { actionMap: WebSocketActionMap, socketDetails: WebSocketDetails, message: any, dataSource?: DataSource }
const handleWebSocketMessage = async ({ actionMap, socketDetails, message, dataSource }: HandleWebSocketMessageArgs) => {
    const { socket, requestMeta, user } = socketDetails;
    const parsedMessage = toWebSocketMessage(requestMeta, message);

    if (!parsedMessage) {
        sendWebSocketMessage({
            socket,
            message: createErrorMessageResponse(requestMeta, "unknown", {
                code: ErrorCodes.INTERNAL_SERVER_ERROR,
                message: `Not able to parse message`,
            }, undefined)
        });
        return;
    }
    const { action, payload, id: messageId } = parsedMessage.message;
    const actionHandler = actionMap[action];

    if (!actionHandler) {
        sendWebSocketMessage({
            socket,
            message: createErrorMessageResponse(requestMeta, action, {
                code: ErrorCodes.NOT_FOUND,
                message: `No handler registered for action "${action}"`,
            }, messageId)
        });
        return;
    }

    try {

        AppLogger.info(requestMeta, {
            message: "Processing WebSocket action",
            object: { action, messageId, roles: user?.roles, msgType: parsedMessage.type },
        });

        const {
            handler,
            validate,
            schemaValidate,
            queryRunnerOptions,
            authenticate: needsAuthentication,
            roles: requiredRoles,
        } = actionHandler;

        if (needsAuthentication && !user) {
            sendWebSocketMessage({
                socket,
                message: createErrorMessageResponse(requestMeta, action, {
                    code: ErrorCodes.UNAUTHORIZED,
                    message: "Authentication required",
                }, messageId)
            });
            return;
        }

        if (!hasRequiredRoles({ userRoles: user?.roles ?? [], requiredRoles })) {
            sendWebSocketMessage({
                socket,
                message: createErrorMessageResponse(requestMeta, action, { code: ErrorCodes.FORBIDDEN, message: "Insufficient permissions" }, messageId)
            });
            return;
        }

        const validation = validateMessagePayload(payload, validate, schemaValidate);
        if (validation) {
            sendWebSocketMessage({
                socket,
                message: createErrorMessageResponse(
                    requestMeta,
                    action,
                    { code: ErrorCodes.VALIDATION, message: validation.message },
                    messageId,
                    validation.errors ?? undefined
                )
            });
            return;
        }

        await withQueryRunner(dataSource, queryRunnerOptions, async (queryRunner) => {
            const args: unknown[] = [socketDetails, parsedMessage.message]
            if (parsedMessage.data) args.push(parsedMessage.data)
            if (queryRunner) args.push(queryRunner)
            //const args = queryRunner ? [socketDetails, parsedMessage.message, parsedMessage.data, queryRunner] : [socketDetails, parsedMessage.message, parsedMessage.data];
            const result = await runWithRequestContext({ queryRunner, requestMeta, user }, async () => {
                return await handler(...args);
            });

            if (result) {
                sendWebSocketMessage({
                    socket,
                    message: JSON.stringify({ success: true, id: messageId, action, payload: result } as GenericWebSocketResponse)
                });
            }
            return result;
        });
    } catch (err: any) {
        AppLogger.error(requestMeta, { message: "Error in WebSocket message", error: err });
        const isAppError = err instanceof AppErrorV2;
        sendWebSocketMessage({
            socket,
            message: createErrorMessageResponse(requestMeta, action,
                isAppError ? err :
                    {
                        code: ErrorCodes.INTERNAL_SERVER_ERROR,
                        message: "An unexpected error occurred",
                    }, messageId)
        });
    }

}

const toWebSocketMessage = (meta: RequestMetaData, message: Buffer | ArrayBuffer | Buffer[]) => {
    try {
        const msg = Array.isArray(message) && message.every((part) => part instanceof Buffer)
            ? Buffer.concat(message) // Merge chunked buffers
            : (message as Buffer | ArrayBuffer);

        const receivedPrefix = msg.byteLength < 4 ? undefined : new TextDecoder("utf-8").decode(
            msg instanceof Buffer ? msg.subarray(0, 4) : msg.slice(0, 4)
        );
        if (receivedPrefix === MAGIC_BINARY_PREFIX) {
            const dataBuffer = msg instanceof Buffer
                ? new Uint8Array(msg.buffer, msg.byteOffset, msg.length)
                : new Uint8Array(msg);
            const headerLength = new DataView(dataBuffer.buffer, dataBuffer.byteOffset, dataBuffer.byteLength).getUint32(4, false);
            const headerJson = new TextDecoder("utf-8").decode(dataBuffer.slice(8, 8 + headerLength));
            const header = JSON.parse(headerJson);
            const binaryData = dataBuffer.slice(8 + headerLength);
            return {
                type: "binary",
                message: header,
                data: binaryData
            }

        } else {
            AppLogger.debug(meta, { message: "Received String WebSocket message" });
            const socketMessage = JSON.parse(msg.toString()) as GenericWebSocketMessage;
            if (socketMessage.action) {
                return {
                    type: "string",
                    message: socketMessage
                }

            }
        }

        AppLogger.error(meta, { message: "No Action defined in WebSocket message" });
    } catch (error) {
        AppLogger.error(meta, { message: "Failed to parse WebSocket message", error });
    }
    return undefined;

}
