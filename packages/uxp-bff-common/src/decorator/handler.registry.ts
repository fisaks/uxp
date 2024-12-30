/**
 * Centralized Registry for Handlers
 *
 * This registry allows for the registration and discovery of REST and WebSocket handlers.
 * Handlers can be registered manually or discovered automatically by scanning directories.
 *
 * ## Usage
 *
 * ### Manual Registration
 *
 * To manually register a handler just import the handler module and it will register itself.
 *
 * ```typescript
 * import "./features/user/user.controller";
 * ```
 *
 * ### Automatic Discovery
 *
 * To automatically discover and register handlers, use the `discoverHandlers` method.
 * This method scans the specified directories for exported classes that contain the necessary annotations.
 *
 * ```typescript
 * HandlerRegistry.discoverHandlers("/path/to/handlers");
 * ```
 *
 * The `discoverHandlers` method accepts a base directory or an array of directories to scan.
 * It also accepts an optional array of file types to consider (default is `["ts", "js"]`).
 *
 * ```typescript
 * HandlerRegistry.discoverHandlers(["/path/to/handlers1", "/path/to/handlers2"], ["ts", "js"]);
 * ```
 *
 * ## Methods
 *
 * - `getRestHandlers()`: Returns the set of registered REST handlers.
 * - `getWsHandlers()`: Returns the set of registered WebSocket handlers.
 * - `registerRestHandler(handler: HandlerConstructor)`: Registers a REST handler.
 * - `registerWsHandler(handler: HandlerConstructor)`: Registers a WebSocket handler.
 * - `discoverHandlers(baseDir: string | string[], types?: string[])`: Discovers and registers handlers from the specified directories.
 *
 * ## Types
 *
 * - `HandlerConstructor<T = any>`: A type representing a handler constructor.
 *
 * @module HandlerRegistry
 */
import { readdirSync, statSync } from "fs";
import path from "path";
import { getRoutes } from "./route.decorator";
import { getWebSocketActions } from "./websocket.decorator";

// Centralized Registry for Handlers
export type HandlerConstructor<T = any> = new (...args: any[]) => T;

export const HandlerRegistry = {
    restHandlers: new Set<HandlerConstructor>(),
    wsHandlers: new Set<HandlerConstructor>(),

    getRestHandlers() {
        return this.restHandlers;
    },

    getWsHandlers() {
        return this.wsHandlers;
    },

    registerRestHandler(handler: HandlerConstructor) {
        if (!this.restHandlers.has(handler)) {
            console.log(`Registering REST handler ${handler.name}`);
            this.restHandlers.add(handler);
        }
    },

    registerWsHandler(handler: HandlerConstructor) {
        if (!this.wsHandlers.has(handler)) {
            console.log(`Registering WebSocket handler ${handler.name}`);
            this.wsHandlers.add(handler);
        }
    },

    discoverHandlers(baseDir: string | string[], types = ["ts", "js"]) {
        console.log(`Discover handlers from ${JSON.stringify(baseDir)}`);

        const scanDirectory = (dir: string) => {
            const entries = readdirSync(dir);
            for (const entry of entries) {
                const fullPath = path.join(dir, entry);
                if (statSync(fullPath).isDirectory()) {
                    scanDirectory(fullPath); // Recursive traversal
                } else if (types.some((type) => entry.endsWith(`.${type}`))) {
                    const module = require(fullPath);

                    const classes = Object.values(module).map((exported) => {
                        if (typeof exported === "function" && /^\s*class\s/.test(exported.toString())) {
                            if (getRoutes(exported.prototype.constructor).length > 0) {
                                return { exported, handler: "rest" };
                            }
                            if (getWebSocketActions(exported.prototype.constructor).length > 0) {
                                return { exported, handler: "ws" };
                            }
                        }
                        return { exported, handler: "none" };
                    });

                    classes.forEach(({ exported, handler }) => {
                        if (handler === "rest") {
                            this.registerRestHandler(exported as HandlerConstructor);
                        } else if (handler === "ws") {
                            this.registerWsHandler(exported as HandlerConstructor);
                        }
                    });
                }
            }
        };
        if (Array.isArray(baseDir)) {
            baseDir.forEach((dir) => scanDirectory(dir));
        } else {
            scanDirectory(baseDir as string);
        }
    },
};
