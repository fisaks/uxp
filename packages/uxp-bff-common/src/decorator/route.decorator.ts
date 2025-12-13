import { ErrorCodes, UserRole } from "@uxp/common";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import "reflect-metadata";
import { DataSource } from "typeorm";

import { ACCESS_TOKEN } from "../config/constant";
import { createErrorResponse } from "../error/errorResponse";
import { Token } from "../types/token.types";
import { AppLogger } from "../utils/AppLogger";
import { HandlerConstructor, HandlerRegistry } from "./handler.registry";
import { getUseQueryRunnerOptions } from "./queryrunner.decorator";
import { hasRequiredRoles, withQueryRunner } from "./request-utils";
import { runWithRequestContext } from "./request-context";

/* eslint-disable @typescript-eslint/no-explicit-any */

// Metadata key for storing route information
const ROUTES_METADATA_KEY = "rest:routes";

// Metadata structure for routes
export interface RouteMetadata {
    method: "get" | "post" | "put" | "delete" | "patch" | "options" | "head" | "all";
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
    /**
     * The target parameter represents the prototype of the class
     * where the decorator is applied.
     */
    return function (target: any, propertyKey: string | symbol) {
        const routes: RouteMetadata[] = Reflect.getMetadata(ROUTES_METADATA_KEY, target.constructor) || [];
        HandlerRegistry.registerRestHandler(target.constructor);
        routes.push({
            method,
            path,
            handlerName: propertyKey as string,
            authenticate: options?.authenticate ?? true, // Default to true
            roles: options?.roles ?? (options?.authenticate ? ["user"] : []),
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

const ALL_METHODS = ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"];
type RegisterRoutesArgs = {
    fastify: FastifyInstance;
    dataSource?: DataSource;
    controllers: HandlerConstructor[];
    basePath?: string;
};

/**
 * Register all routes from controllers in Fastify
 * @param fastify Fastify instance
 * @param controllers Array of controller classes
 * @param basePath Base path for all routes
 */
export function registerRoutes({ fastify, dataSource, controllers, basePath = "/api" }: RegisterRoutesArgs) {
    controllers.forEach((ControllerClass) => {
        const instance =
            ControllerClass.length > 0 // Constructor has parameters
                ? new ControllerClass(fastify) // Pass the Fastify instance
                : new ControllerClass(); // Instantiate without parameters

        const routes: RouteMetadata[] = getRoutes(ControllerClass);

        routes.forEach(({ method, path, validate, schema, handlerName, authenticate, roles }) => {
            AppLogger.info(undefined, {
                message: `Registering route: ${method} ${basePath}${path} => ${ControllerClass.name}.${handlerName}`,
            });

            const originalHandler = instance[handlerName].bind(instance);
            const url = `${basePath}${path}`;

            fastify.route({
                method: method === "all" ? ALL_METHODS : method.toUpperCase(),
                url,
                schema, // Attach validation schema here

                preHandler: async (request: FastifyRequest, reply: FastifyReply) => {
                    if (request.url !== `${basePath}/refresh-token`) {
                        if (authenticate || request.cookies[ACCESS_TOKEN]) {
                            // Verify JWT token
                            try {
                                await request.jwtVerify();
                            } catch (err) {
                                AppLogger.error(request, { message: "Failed to verify access token", error: err });
                                reply.code(401).send(createErrorResponse([{ code: ErrorCodes.UNAUTHORIZED }], request));
                                return;
                            }
                            const user = request.user as Token;

                            // Check user role
                            if (!hasRequiredRoles({ userRoles: user?.roles ?? [], requiredRoles: roles ?? [] })) {
                                AppLogger.error(request, {
                                    message: "User does not have the required role to access this route",
                                    object: { url, roles: user?.roles },
                                });
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
                    const queryRunnerOptions = getUseQueryRunnerOptions(ControllerClass.prototype, handlerName);

                    return await withQueryRunner(dataSource, queryRunnerOptions, async (queryRunner) => {
                        const args = queryRunner ? [request, reply, queryRunner] : [request, reply];
                        const user = request.user as Token;
                        const requestMeta = AppLogger.extractMetadata(request, true);
                        return runWithRequestContext({ queryRunner, requestMeta, user }, async () => {
                            return await originalHandler(...args);
                        });
                    });
                },
            });
        });
    });
}
