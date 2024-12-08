import { ErrorCodes, UserRole } from "@uxp/common";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import "reflect-metadata";
import { QueryRunner } from "typeorm";

import { ACCESS_TOKEN } from "../config/constant";
import { createErrorResponse } from "../error/errorResponse";
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
    validate?: (req: FastifyRequest) => boolean;
    authenticate: boolean; // If true, the route requires authentication
    roles: UserRole[]; // Roles allowed to access this route
    schema?: {
        body?: object; // JSON Schema for the request body
        querystring?: object; // JSON Schema for query parameters
        headers?: object; // JSON Schema for headers
    };
}

export type RouteValidateFunction = RouteMetadata["validate"];
/**
 * Route decorator for registering a route method
 * @param method HTTP method (get, post, put, delete)
 * @param path Route path
 * @param options Optional validation and schema configuration
 */
export function Route(
    method: RouteMetadata["method"],
    path: RouteMetadata["path"],
    options?: {
        authenticate?: boolean; // Requires authentication (default: true)
        roles?: UserRole[]; // Allowed roles (default: ['user'])
        validate?: RouteValidateFunction;
        schema?: RouteMetadata["schema"];
    }
): MethodDecorator {
    return function (target: any, propertyKey: string | symbol) {
        const routes: RouteMetadata[] = Reflect.getMetadata(ROUTES_METADATA_KEY, target.constructor) || [];

        routes.push({
            method,
            path,
            handlerName: propertyKey as string,
            authenticate: options?.authenticate ?? true, // Default to true
            roles: (options?.roles ?? options?.authenticate) ? ["user"] : [],
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
export function registerRoutes(fastify: FastifyInstance, controllers: any[], basePath: string = "/api") {
    controllers.forEach((ControllerClass) => {
        const instance =
            ControllerClass.length > 0 // Constructor has parameters
                ? new ControllerClass(fastify) // Pass the Fastify instance
                : new ControllerClass(); // Instantiate without parameters

        const routes: RouteMetadata[] = getRoutes(ControllerClass);

        routes.forEach(({ method, path, validate, schema, handlerName, authenticate, roles }) => {
            console.log(`Restroute:\t${method} ${basePath}${path} => ${ControllerClass.name}.${handlerName}`);

            const originalHandler = instance[handlerName].bind(instance);

            fastify.route({
                method: method.toUpperCase(),
                url: `${basePath}${path}`,
                schema, // Attach validation schema here

                preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
                    if (authenticate || request.cookies[ACCESS_TOKEN]) {
                        // Verify JWT token
                        try {
                            await request.jwtVerify();
                        } catch (err) {
                            fastify.log.error({ err }, "Failed to verify access token");
                            reply.code(401).send(createErrorResponse([{ code: ErrorCodes.UNAUTHORIZED }], request));
                            return;
                        }

                        // Check user role
                        if (roles && roles.length > 0) {
                            const user = request.user as { roles: UserRole[] }; // Assume `user` is attached by `jwtVerify()`
                            if (!user.roles.includes("admin") && !user.roles.some((r) => roles.includes(r))) {
                                console.log("WRONG ROLE ", user.roles, roles);
                                reply.code(403).send(createErrorResponse([{ code: ErrorCodes.FORBIDDEN }], request));
                                return;
                            }
                        }
                    }
                },
                handler: async (request, reply) => {
                    // Optional validation
                    if (validate && !validate(request)) {
                        reply.code(400).send(createErrorResponse([{ code: ErrorCodes.VALIDATION }], request));
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
