import Ajv from "ajv";
import { FastifyInstance } from "fastify";
import "reflect-metadata";
import { QueryRunner } from "typeorm";
import { getUseQueryRunnerOptions, UseQueryRunnerOptions } from "./queryrunner.decorator";
const { AppDataSource } = require("../db/typeorm.config");

const ajv = new Ajv();

const WEBSOCKET_ACTIONS_METADATA_KEY = "websocket:actions";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface WebSocketActionMetadata {
    action: string;
    handlerName: string;
    validate?: (payload: any) => boolean;
    schema?: object;
}

/**
 * WebSocketAction decorator for registering WebSocket message handlers
 * @param action The action name for the WebSocket message
 * @param options Optional validation and schema configuration
 */
export function WebSocketAction(
    action: string,
    options?: { validate?: (payload: any) => boolean; schema?: object }
): MethodDecorator {
    return function (target: any, propertyKey: string | symbol) {
        const actions: WebSocketActionMetadata[] = Reflect.getMetadata(WEBSOCKET_ACTIONS_METADATA_KEY, target) || [];
        actions.push({
            action,
            handlerName: propertyKey as string,
            validate: options?.validate,
            schema: options?.schema,
        });
        Reflect.defineMetadata(WEBSOCKET_ACTIONS_METADATA_KEY, actions, target);
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
    schemaValidate?: Ajv.ValidateFunction;
    queryRunnerOptions?: UseQueryRunnerOptions | null;
}

type WebSocketActionMap = Record<string, WebSocketActionHandler>;

function preloadWebSocketHandlers(handlers: any[]): WebSocketActionMap {
    const actionMap: WebSocketActionMap = {};

    handlers.forEach((HandlerClass) => {
        const instance = new HandlerClass();
        const actions: WebSocketActionMetadata[] = getWebSocketActions(HandlerClass.prototype);

        actions.forEach(({ action, validate, schema, handlerName }) => {
            console.log(`WebSocket Action:\t/ws\t${action} => ${HandlerClass.name}.${handlerName}`);
            const schemaValidate = schema ? ajv.compile(schema) : undefined;
            const queryRunnerOptions = getUseQueryRunnerOptions(HandlerClass.prototype, handlerName);

            actionMap[action] = {
                handler: instance[handlerName].bind(instance),
                validate,
                schemaValidate,
                queryRunnerOptions,
            };
        });
    });

    return actionMap;
}
/**
 * Register WebSocket handlers with Fastify
 * @param fastify Fastify instance
 * @param handlers Array of handler classes
 */
export function registerWebSocketHandlers(fastify: FastifyInstance, handlers: any[]) {
    const actionMap = preloadWebSocketHandlers(handlers);
    fastify.get("/ws", { websocket: true }, (socket /* WebSocket */, _req /* FastifyRequest */) => {
        console.log("WebSocket connection established");

        socket.on("message", async (message) => {
            let queryRunner: QueryRunner | undefined;
            try {
                let payload: unknown;
                let action: string | undefined;
                try {
                    const parsedMessage = JSON.parse(message.toString());
                    action = parsedMessage.action;
                    payload = parsedMessage.payload;
                } catch (err) {
                    console.error("Invalid JSON payload", err);
                    socket.send(JSON.stringify({ error: "Invalid JSON payload" }));
                    return;
                }

                // Ensure the action exists in the action map
                const actionHandler = action && actionMap[action];
                if (!actionHandler) {
                    socket.send(
                        JSON.stringify({
                            error: `No handler registered for action "${action}"`,
                        })
                    );
                    return;
                }
                const { handler, validate, schemaValidate, queryRunnerOptions } = actionHandler;

                // Perform custom validation
                if (validate && !validate(payload)) {
                    socket.send(
                        JSON.stringify({
                            error: "Validation failed",
                        })
                    );
                    return;
                }
                // Schema validation
                if (schemaValidate && !schemaValidate(payload)) {
                    socket.send(
                        JSON.stringify({
                            error: "Schema validation failed",
                            details: schemaValidate.errors,
                        })
                    );
                    return;
                }

                // Check for QueryRunner options
                if (queryRunnerOptions) {
                    queryRunner = AppDataSource.createQueryRunner();
                    await queryRunner!.connect();

                    if (queryRunnerOptions.transactional) {
                        await queryRunner!.startTransaction();
                    }
                }

                // Inject the QueryRunner as an additional argument if required
                const args = queryRunner ? [payload, queryRunner] : [payload];
                const result = await handler(...args);

                if (queryRunner?.isTransactionActive) {
                    await queryRunner.commitTransaction();
                }

                if (result) {
                    socket.send(JSON.stringify(result));
                }
            } catch (err: any) {
                if (queryRunner?.isTransactionActive) {
                    await queryRunner.rollbackTransaction();
                }
                console.error("Error in WebSocket message", err);
                socket.send(JSON.stringify({ error: err.message }));
            } finally {
                if (queryRunner) {
                    await queryRunner.release();
                }
            }
        });
    });
}
