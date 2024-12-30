import Ajv, { ValidateFunction } from "ajv";
import { FastifyInstance } from "fastify";
import "reflect-metadata";
import { DataSource } from "typeorm";
import { ACCESS_TOKEN } from "../config/constant";
import { createErrorMessageResponse } from "../error/errorResponse";
import { Token } from "../types/token.types";
import { AppLogger } from "../utils/AppLogger";
import { HandlerConstructor, HandlerRegistry } from "./handler.registry";
import { getUseQueryRunnerOptions, UseQueryRunnerOptions } from "./queryrunner.decorator";
import { hasRequiredRoles, validateMessagePayload, withQueryRunner } from "./request-utils";
import { ErrorCodes, UserRole } from "@uxp/common";

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
        const actions: WebSocketActionMetadata[] =
            Reflect.getMetadata(WEBSOCKET_ACTIONS_METADATA_KEY, target.constructor) || [];
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
type WebSocketMessage = {
    action: string;
    payload: Record<string, unknown>;
};

/**
 * Register WebSocket handlers with Fastify
 * @param fastify Fastify instance
 * @param handlers Array of handler classes
 */
export function registerWebSocketHandlers({ fastify, dataSource, handlers }: RegisterWebSocketHandlersArgs) {
    const actionMap = preloadWebSocketHandlers(fastify, handlers);

    // @ts-ignore: WebSocket route
    fastify.get("/ws", { websocket: true }, async (socket /* WebSocket */, request /* FastifyRequest */) => {
        // @ts-ignore: WebSocket route
        AppLogger.info(request, { message: "WebSocket connection established" });
        let user: Token | undefined = undefined;
        // @ts-ignore: WebSocket route
        if (request.cookies[ACCESS_TOKEN]) {
            try {
                // @ts-ignore: WebSocket route
                await request.jwtVerify();
                // @ts-ignore: WebSocket route
                user = request.user as Token;
            } catch (err: unknown) {
                // @ts-ignore: WebSocket route
                AppLogger.error(request, {
                    message: "Failed to verify access token in WebSocket connection",
                    error: err,
                    object: { username: user?.username },
                });
            }
        }

        // @ts-ignore: WebSocket route
        socket.on("message", async (message) => {
            try {
                let payload: unknown;
                let action: string | undefined;

                try {
                    const parsedMessage: WebSocketMessage = JSON.parse(message.toString());
                    action = parsedMessage.action;
                    payload = parsedMessage.payload;
                } catch (err) {
                    // @ts-ignore: just
                    AppLogger.error(request, { message: "Invalid JSON Message", error: err });
                    // @ts-ignore: just
                    socket.send(
                        createErrorMessageResponse({ code: ErrorCodes.VALIDATION, message: "Invalid Message" })
                    );
                    return;
                }

                // Ensure the action exists in the action map
                const actionHandler = action && actionMap[action];
                if (!actionHandler) {
                    // @ts-ignore: WebSocket route
                    AppLogger.error(request, {
                        message: `No handler registered for action "${action}"`,
                        object: { username: user?.username, action, roles: user?.roles },
                    });
                    // @ts-ignore: WebSocket route
                    socket.send(
                        createErrorMessageResponse({
                            code: ErrorCodes.NOT_FOUND,
                            message: `No handler registered for action "${action}`,
                        })
                    );
                    return;
                }
                // @ts-ignore: WebSocket route
                AppLogger.info(request, {
                    message: "Processing WebSocket action",
                    object: { username: user?.username, action, roles: user?.roles },
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
                    // @ts-ignore: WebSocket route
                    socket.send(
                        createErrorMessageResponse({
                            code: ErrorCodes.UNAUTHORIZED,
                            message: "Authentication required",
                        })
                    );
                    return;
                }

                if (!hasRequiredRoles({ userRoles: user?.roles ?? [], requiredRoles })) {
                    // @ts-ignore: WebSocket route
                    socket.send(
                        createErrorMessageResponse({ code: ErrorCodes.FORBIDDEN, message: "Insufficient permissions" })
                    );
                    return;
                }

                const validation = validateMessagePayload(payload, validate, schemaValidate);
                if (validation) {
                    // @ts-ignore: WebSocket route
                    socket.send(
                        createErrorMessageResponse(
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
                        // @ts-ignore: WebSocket route
                        socket.send(JSON.stringify({ success: true, data: result }));
                    }
                    return result;
                });
            } catch (err: any) {
                // @ts-ignore: WebSocket route
                AppLogger.error(request, { message: "Error in WebSocket message", error: err });
                // @ts-ignore: WebSocket route
                socket.send(
                    createErrorMessageResponse({
                        code: ErrorCodes.INTERNAL_SERVER_ERROR,
                        message: "An unexpected error occurred",
                    })
                );
            }
        });
    });
}
