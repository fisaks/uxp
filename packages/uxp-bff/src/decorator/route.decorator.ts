import { FastifyInstance } from "fastify";
import "reflect-metadata";
import { QueryRunner } from "typeorm";
import { getUseQueryRunnerOptions } from "./queryrunner.decorator";
const { AppDataSource } = require("../db/typeorm.config");

/* eslint-disable @typescript-eslint/no-explicit-any */

// Metadata key for storing route information
const ROUTES_METADATA_KEY = "rest:routes";

// Metadata structure for routes
export interface RouteMetadata {
    method: "get" | "post" | "put" | "delete";
    path: string;
    handlerName: string;
    validate?: (payload: any) => boolean;
    schema?: {
        body?: object; // JSON Schema for the request body
        querystring?: object; // JSON Schema for query parameters
        headers?: object; // JSON Schema for headers
    };
}

/**
 * Route decorator for registering a route method
 * @param method HTTP method (get, post, put, delete)
 * @param path Route path
 * @param options Optional validation and schema configuration
 */
export function Route(
    method: RouteMetadata["method"],
    path: RouteMetadata["path"],
    options?: { validate?: RouteMetadata["validate"]; schema?: RouteMetadata["schema"] }
): MethodDecorator {
    return function (target: any, propertyKey: string | symbol) {
        const routes: RouteMetadata[] = Reflect.getMetadata(ROUTES_METADATA_KEY, target.constructor) || [];

        routes.push({
            method,
            path,
            handlerName: propertyKey as string,
            validate: options?.validate,
            schema: options?.schema,
        });
        Reflect.defineMetadata(ROUTES_METADATA_KEY, routes, target.constructor);
    };
}

/**
 * Retrieve registered routes from a controller
 * @param target The controller class
 * @returns Array of route metadata
 */
export function getRoutes(target: any): RouteMetadata[] {
    return Reflect.getMetadata(ROUTES_METADATA_KEY, target) || [];
}

/**
 * Register all routes from controllers in Fastify
 * @param fastify Fastify instance
 * @param controllers Array of controller classes
 * @param basePath Base path for all routes
 */
export function registerRoutes(fastify: FastifyInstance, controllers: any[], basePath: string = '/api') {
    controllers.forEach((ControllerClass) => {
        const instance = new ControllerClass();

        const routes: RouteMetadata[] = getRoutes(ControllerClass);

        routes.forEach(({ method, path, validate, schema, handlerName }) => {
            console.log(`Restroute:\t${method} ${basePath}${path} => ${ControllerClass.name}.${handlerName}`);

            const originalHandler = instance[handlerName].bind(instance);

            fastify.route({
                method: method.toUpperCase(),
                url: `${basePath}${path}`,
                schema, // Attach validation schema here
                handler: async (request, reply) => {
                    // Optional validation
                    if (validate && !validate(request.body)) {
                        reply.code(400).send({ error: "Validation failed" });
                        return;
                    }
                    let queryRunner: QueryRunner | undefined;
                    try {
                        // Check for QueryRunner options
                        const queryRunnerOptions = getUseQueryRunnerOptions(ControllerClass.prototype, handlerName);
                        if (queryRunnerOptions) {
                            queryRunner = AppDataSource.createQueryRunner();
                            await queryRunner!.connect();

                            if (queryRunnerOptions.transactional) {
                                await queryRunner!.startTransaction();
                            }
                        }

                        // Inject the QueryRunner as an additional argument if required
                        const args = queryRunner ? [request, reply, queryRunner] : [request, reply];

                        // Execute the original handler
                        const result = await originalHandler(...args);
                        if (queryRunner?.isTransactionActive) {
                            await queryRunner.commitTransaction();
                        }
                        return result;
                    } catch (err) {
                        if (queryRunner?.isTransactionActive) {
                            await queryRunner.rollbackTransaction();
                        }
                        throw err;
                    } finally {
                        if (queryRunner) {
                            await queryRunner.release();
                        }
                    }
                },
            });
        });
    });
}
