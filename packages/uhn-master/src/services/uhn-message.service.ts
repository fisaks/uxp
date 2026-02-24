import { UhnSubscriptionPattern } from "@uhn/common";
import { WebSocket } from "ws";
import { systemStatusBroadcaster } from "../system/system-status.broadcaster";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";
import { blueprintResourceService } from "./blueprint-resource.service";
import { runtimeOverviewService } from "./runtime-overview.service";
import { stateRuntimeService } from "./state-runtime.service";
import { uhnHealthService } from "./uhn-health.service";
import { uhnSystemSnapshotService } from "./uhn-system-snapshot.service";


export class UhnMessageService {
    private wsManager = UHNAppServerWebSocketManager.getInstance();

    constructor() {
    }

    async subscribeToPatterns(socket: WebSocket, patterns: UhnSubscriptionPattern[], messageId?: string) {
        patterns.forEach(pattern =>
            this.wsManager.subscribeToUhnMessagePattern(socket, pattern)
        );
        this.wsManager.sendMessage(socket, {
            action: "uhn:subscribed",
            success: true,
            payload: { patterns },
            id: messageId
        });

        const shouldSendResources = patterns.some(pattern => pattern.startsWith('resource/'));
        const shouldSendStates = patterns.some(pattern => pattern.startsWith('state/'));
        const shouldSendHealth = patterns.some(pattern => pattern === 'health/*');
        const shouldSendSystem = patterns.some(pattern => pattern === 'system/*');
        const shouldSendRuntime = patterns.some(p => p === 'runtime/*');

        if (shouldSendResources) {
            await this.sendResourcesMessage(socket, patterns);
        }
        if (shouldSendStates) {
            await this.sendStateMessage(socket, patterns);
        }
        if (shouldSendHealth) {
            await this.sendHealthMessage(socket);
        }
        if (shouldSendSystem) {
            this.sendSystemSnapshotMessage(socket);
            this.sendSystemStatusMessage(socket);
        }
        if (shouldSendRuntime) {
            this.sendRuntimeOverviewMessage(socket);
        }

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

    async sendHealthMessage(socket: WebSocket) {
        const healthSnapshot = await uhnHealthService.getHealthSnapshot();
        this.wsManager.sendMessage(socket, {
            action: "uhn:health:snapshot",
            success: true,
            payload: healthSnapshot
        });
    }

    sendSystemStatusMessage(socket: WebSocket) {
        const systemStatus = systemStatusBroadcaster.getSnapshot();
        this.wsManager.sendMessage(socket, {
            action: "uhn:system:status",
            success: true,
            payload: systemStatus
        });
    }


    sendSystemSnapshotMessage(socket: WebSocket) {
        const systemSnapshot = uhnSystemSnapshotService.getSnapshot();
        this.wsManager.sendMessage(socket, {
            action: "uhn:system:snapshot",
            success: true,
            payload: systemSnapshot
        });
    }

    sendRuntimeOverviewMessage(socket: WebSocket) {
        const overview = runtimeOverviewService.getOverview();
        this.wsManager.sendMessage(socket, {
            action: "uhn:runtime:overview",
            success: true,
            payload: overview
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