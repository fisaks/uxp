import { UxpSubscriptionPattern } from "@uxp/common";
import { WebSocket } from "ws";
import { PlatformHealthService } from "./platform-health.service";
import { UxpServerWebSocketManager } from "../websocket/UxpServerWebSocketManager";

class UxpMessageServiceImpl {

    subscribe(socket: WebSocket, patterns: UxpSubscriptionPattern[]) {
        const wsManager = UxpServerWebSocketManager.getInstance();

        for (const pattern of patterns) {
            wsManager.subscribeToPattern(socket, pattern);
        }

        // Send current snapshots for subscribed patterns
        const shouldSendHealth = patterns.some((p) => p.startsWith("health"));
        if (shouldSendHealth) {
            wsManager.sendMessage(socket, {
                action: "uxp:health:snapshot",
                success: true,
                payload: PlatformHealthService.getSnapshot(),
            });
        }

        wsManager.sendMessage(socket, {
            action: "uxp:subscribed",
            success: true,
            payload: { patterns },
        });
    }

    unsubscribe(socket: WebSocket, patterns: UxpSubscriptionPattern[]) {
        const wsManager = UxpServerWebSocketManager.getInstance();

        for (const pattern of patterns) {
            wsManager.unsubscribeFromPattern(socket, pattern);
        }

        wsManager.sendMessage(socket, {
            action: "uxp:unsubscribed",
            success: true,
            payload: { patterns },
        });
    }
}

export const uxpMessageService = new UxpMessageServiceImpl();
