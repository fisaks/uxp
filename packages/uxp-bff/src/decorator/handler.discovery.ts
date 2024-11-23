import { readdirSync, statSync } from 'fs';
import path from 'path';
import { getRoutes } from './route.decorator';
import { getWebSocketActions } from './websocket.decorator';
const { IsProd } = require('../config/env');
/* eslint-disable @typescript-eslint/no-explicit-any */

export function discoverHandlers(baseDir: string): any[] {
    console.log(`Discover handlers from ${baseDir}`)

    const handlers: any[] = [];
    function scanDirectory(dir: string) {
        const entries = readdirSync(dir);
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            if (statSync(fullPath).isDirectory()) {
                scanDirectory(fullPath); // Recursive traversal
            } else if (entry.endsWith(IsProd ? '.js' : '.ts')) {
                const module = require(fullPath);

                const classesWithActions = Object.values(module).filter((exported) => {

                    if (typeof exported === 'function' && /^\s*class\s/.test(exported.toString())) {
                        const actions = [...getWebSocketActions(exported.prototype), ...getRoutes(exported.prototype.constructor)];

                        if (actions && actions.length > 0) {
                            console.log("Discover handler " + exported.prototype.constructor.name)
                            return true;
                        } // Only include if actions are defined
                    }
                    return false;
                });
                handlers.push(...classesWithActions);
            }
        }
    }

    scanDirectory(baseDir);
    return handlers;
}
