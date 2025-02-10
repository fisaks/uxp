import { ErrorCodes, UserRole } from "@uxp/common";
import Ajv, { ValidateFunction } from "ajv";
import { FastifyInstance, FastifyRequest } from "fastify";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { ACCESS_TOKEN } from "../config/constant";
import { createErrorMessageResponse } from "../error/errorResponse";
import { Token } from "../types/token.types";
import { AppLogger } from "../utils/AppLogger";
import { HandlerConstructor, HandlerRegistry } from "./handler.registry";
import { getUseQueryRunnerOptions, UseQueryRunnerOptions } from "./queryrunner.decorator";
import { hasRequiredRoles, validateMessagePayload, withQueryRunner } from "./request-utils";

const ajv = new Ajv();

const WEBSOCKET_ACTIONS_METADATA_KEY = "websocket:actions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface WebSocketActionMetadata {
    action: string;
    handlerName: string;
    validate?: (payload: any) => boolean;
    schema?: object;
    authenticate: boolean; // If true, the route requires authentication
    roles: UserRole[]; // Roles allowed to access this route
}

type MessageValidateFunction = WebSocketActionMetadata["validate"];
/**
 * WebSocketAction decorator for registering WebSocket message handlers
 * @param action The action name for the WebSocket message
 * @param options Optional validation and schema configuration
 */
export function WebSocketAction(
    action: string,
    options?: {
        authenticate?: boolean; // Requires authentication (default: true)
        roles?: UserRole[]; // Allowed roles (default: ['user'])
        validate?: MessageValidateFunction;
        schema?: WebSocketActionMetadata["schema"];
    }
): MethodDecorator {
    return function (target: any, propertyKey: string | symbol) {
        const actions: WebSocketActionMetadata[] = Reflect.getMetadata(WEBSOCKET_ACTIONS_METADATA_KEY, target.constructor) || [];
        HandlerRegistry.registerWsHandler(target.constructor);

        actions.push({
            action,
            handlerName: propertyKey as string,
            validate: options?.validate,
            schema: options?.schema,
            authenticate: options?.authenticate ?? true, // Default to true
            roles: options?.roles ?? (options?.authenticate ? ["user"] : []),
        });
        Reflect.defineMetadata(WEBSOCKET_ACTIONS_METADATA_KEY, actions, target.constructor);
    };
}

/**
 * Retrieve registered WebSocket actions from a handler
 * @param target The handler class
 * @returns Array of WebSocket action metadata
 */
export function getWebSocketActions(target: any): WebSocketActionMetadata[] {
    return Reflect.getMetadata(WEBSOCKET_ACTIONS_METADATA_KEY, target) || [];
}

// Preloaded action map type
interface WebSocketActionHandler {
    handler: Function;
    validate?: (payload: unknown) => boolean;
    schemaValidate?: ValidateFunction;
    queryRunnerOptions?: UseQueryRunnerOptions | null;
    authenticate: boolean;
    roles: UserRole[];
}

type WebSocketActionMap = Record<string, WebSocketActionHandler>;

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
type RegisterWebSocketHandlersArgs = {
    fastify: FastifyInstance;
    dataSource?: DataSource;
    handlers: HandlerConstructor[];
};


/**
 * Register WebSocket handlers with Fastify
 * @param fastify Fastify instance
 * @param handlers Array of handler classes
 */
export function registerLocalWebSocketHandlers({ fastify, dataSource, handlers }: RegisterWebSocketHandlersArgs) {
    const actionMap = preloadWebSocketHandlers(fastify, handlers);

    fastify.get("/ws", { websocket: true }, async (socket /* WebSocket */, request /* FastifyRequest */) => {
        AppLogger.info(request, { message: "WebSocket connection established (local)" });

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

        const PING_INTERVAL = 30000; // Ping every 30s
        const PONG_TIMEOUT = 10000; // Wait max 10s for pong
        let pongReceived = true;
        let pongTimeout: NodeJS.Timeout | null = null;

        const sendPing = () => {
            if (socket.readyState !== socket.OPEN) return;

            pongReceived = false;
            socket.ping();

            // **Set a timeout to check if pong is received in time**
            pongTimeout = setTimeout(() => {
                if (!pongReceived) {
                    AppLogger.warn(request, { message: "Client did not respond to ping. Closing WebSocket." });
                    socket.close();
                }
            }, PONG_TIMEOUT);
        };

        const pingInterval = setInterval(sendPing, PING_INTERVAL);

        socket.on("pong", () => {
            AppLogger.debug(request, { message: "Pong received from client" });
            pongReceived = true;

            // **Clear the pong timeout when we get a response**
            if (pongTimeout) {
                clearTimeout(pongTimeout);
                pongTimeout = null;
            }
        });

        socket.on("message", async (message) => {
            try {
                const parsedMessage = JSON.parse(message.toString());
                const action = parsedMessage.action;
                const payload = parsedMessage.payload;
                const actionHandler = actionMap[action];

                if (!actionHandler) {
                    socket.send(
                        createErrorMessageResponse(request, action, {
                            code: ErrorCodes.NOT_FOUND,
                            message: `No handler registered for action "${action}`,
                        })
                    );
                    return;
                }

                AppLogger.info(request, {
                    message: "Processing WebSocket action",
                    object: { action, roles: user?.roles },
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
                    socket.send(
                        createErrorMessageResponse(request, action, {
                            code: ErrorCodes.UNAUTHORIZED,
                            message: "Authentication required",
                        })
                    );
                    return;
                }

                if (!hasRequiredRoles({ userRoles: user?.roles ?? [], requiredRoles })) {
                    socket.send(
                        createErrorMessageResponse(request, action, { code: ErrorCodes.FORBIDDEN, message: "Insufficient permissions" })
                    );
                    return;
                }

                const validation = validateMessagePayload(payload, validate, schemaValidate);
                if (validation) {
                    socket.send(
                        createErrorMessageResponse(
                            request,
                            action,
                            { code: ErrorCodes.VALIDATION, message: validation.message },
                            validation.errors ?? undefined
                        )
                    );
                    return;
                }

                await withQueryRunner(dataSource, queryRunnerOptions, async (queryRunner) => {
                    const args = queryRunner ? [payload, user, queryRunner] : [payload, user];
                    const result = await handler(...args);

                    if (result) {
                        socket.send(JSON.stringify({ success: true, data: result }));
                    }
                    return result;
                });
            } catch (err: any) {
                AppLogger.error(request, { message: "Error in WebSocket message", error: err });

                socket.send(
                    createErrorMessageResponse(request, "unknown", {
                        code: ErrorCodes.INTERNAL_SERVER_ERROR,
                        message: "An unexpected error occurred",
                    })
                );
            }
        });
        socket.on("error", (error) => {
            AppLogger.error(request, { message: "WebSocket error occurred", error });
        });

        socket.on("close", (code, reason) => {
            AppLogger.info(request, { message: `WebSocket closed (code: ${code}, reason: ${reason.toString()})` });
            clearInterval(pingInterval);
            if (pongTimeout) clearTimeout(pongTimeout);
        });
    });
}
