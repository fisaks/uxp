import { UhnSubscriptionPattern } from "@uhn/common";
import { WebSocket } from "ws";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";
import { blueprintResourceService } from "./blueprint-resource.service";
import { stateRuntimeService } from "./state-runtime.service";


export class UhnMessageService {
    private wsManager = UHNAppServerWebSocketManager.getInstance();

    constructor() {
    }

    async subscribeToPatterns(socket: WebSocket, patterns: UhnSubscriptionPattern[], messageId?: string) {
        patterns.forEach(pattern =>
            this.wsManager.subscribeToUhnMessagePattern(socket, pattern)
        );

        const shouldSendResources = patterns.some(pattern => pattern.startsWith('resource/'));
        const shouldSendStates = patterns.some(pattern => pattern.startsWith('state/'));
        if (shouldSendResources) {
            await this.sendResourcesMessage(socket, patterns);
        }
        if (shouldSendStates) {
            await this.sendStateMessage(socket, patterns);
        }
        this.wsManager.sendMessage(socket, {
            action: "uhn:subscribed",
            success: true,
            payload: { patterns },
            id: messageId
        });
    }

    async sendResourcesMessage(socket: WebSocket, patterns: UhnSubscriptionPattern[]) {
        const shouldSendAllResources = patterns.some(pattern =>
            pattern === 'resource/*'
        );
        const resourceIds = shouldSendAllResources
            ? undefined
            : patterns
                .filter(pattern => pattern.startsWith('resource/'))
                .map(pattern => pattern.replace('resource/', ''))
                .filter(id => id.length > 0);

        const resources = shouldSendAllResources
            ? await blueprintResourceService.getAllResources()
            : await blueprintResourceService.findResourcesByIds(resourceIds);

        this.wsManager.sendMessage(socket, {
            action: "uhn:resources",
            success: true,
            payload: {
                resources: resources
            }
        });

    }

    async sendStateMessage(socket: WebSocket, patterns: UhnSubscriptionPattern[]) {
        const shouldSendAllStates = patterns.some(pattern =>
            pattern === 'state/*'
        );
        const stateIds = shouldSendAllStates
            ? undefined
            : patterns
                .filter(pattern => pattern.startsWith('state/'))
                .map(pattern => pattern.replace('state/', ''))
                .filter(id => id.length > 0);

        const states = shouldSendAllStates
            ? await stateRuntimeService.getAllStates()
            : await stateRuntimeService.getResourceStates(stateIds!);


        this.wsManager.sendMessage(socket, {
            action: "uhn:fullState",
            success: true,
            payload: {
                states: states
            }
        });

    }
    async unsubscribeFromPatterns(socket: WebSocket, patterns: UhnSubscriptionPattern[], messageId?: string) {
        patterns.forEach(pattern =>
            this.wsManager.unsubscribeFromUhnMessagePattern(socket, pattern)
        );
        this.wsManager.sendMessage(socket, {
            action: "uhn:unsubscribed",
            success: true,
            payload: { patterns },
            id: messageId
        });
    }

}