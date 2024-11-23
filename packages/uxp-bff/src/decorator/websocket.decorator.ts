import Ajv from "ajv";
import { FastifyInstance } from "fastify";
import "reflect-metadata";
import { QueryRunner } from "typeorm";
import { getUseQueryRunnerOptions } from "./queryrunner.decorator";
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

/**
 * Register WebSocket handlers with Fastify
 * @param fastify Fastify instance
 * @param handlers Array of handler classes
 */
export function registerWebSocketHandlers(fastify: FastifyInstance, handlers: any[]) {
  fastify.get("/ws", { websocket: true }, (socket /* WebSocket */, _req /* FastifyRequest */) => {
    handlers.forEach((HandlerClass) => {
      const instance = new HandlerClass();
      const actions: WebSocketActionMetadata[] = getWebSocketActions(HandlerClass.prototype);

      actions.forEach(({ action, validate, schema, handlerName }) => {
        console.log(`Registering WebSocket Action:\t${action}  => ${HandlerClass.name}.${handlerName}`);
        const schemaValidate = schema ? ajv.compile(schema) : null;

        const originalHandler = instance[handlerName].bind(instance);

        socket.on(action, async (message) => {
          let queryRunner: QueryRunner | undefined;
          try {
            let payload: unknown;
            try {
              payload = JSON.parse(message);
            } catch (err) {
              console.error("Invalid JSON payload", err);
              socket.send(JSON.stringify({ error: "Invalid JSON payload" }));
              return;
            }

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
            const queryRunnerOptions = getUseQueryRunnerOptions(HandlerClass.prototype, handlerName);
            if (queryRunnerOptions) {
              queryRunner = AppDataSource.createQueryRunner();
              await queryRunner!.connect();

              if (queryRunnerOptions.transactional) {
                await queryRunner!.startTransaction();
              }
            }

            // Inject the QueryRunner as an additional argument if required
            const args = queryRunner ? [payload, queryRunner] : [payload];
            const result = await originalHandler(...args);

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
            console.error(`Error in WebSocket action "${action}":`, err);
            socket.send(JSON.stringify({ error: err.message }));
          } finally {
            if (queryRunner) {
              await queryRunner.release();
            }
          }
        });
      });
    });
  });
}
