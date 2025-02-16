import { UserRole } from "@uxp/common";
import "reflect-metadata";
import { HandlerRegistry } from "./handler.registry";



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