import { subscriptionService } from "../services/subscription.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

let initialized = false;

export function initTopicTraceDispatcher(): void {
    if (initialized) return;
    initialized = true;
    subscriptionService.on("deviceState", (topic, payload) => {
        UHNAppServerWebSocketManager.getInstance().broadcastTopicMessage({
            payload: { topic, message: payload }
        });
    });
    subscriptionService.on("signalState", (topic, payload) => {
        UHNAppServerWebSocketManager.getInstance().broadcastTopicMessage({
            payload: { topic, message: payload }
        });
    });
    subscriptionService.on("catalog", (topic, payload) => {
        UHNAppServerWebSocketManager.getInstance().broadcastTopicMessage({
            payload: { topic, message: payload }
        });
    });
    subscriptionService.on("cmd", (topic, payload) => {
        UHNAppServerWebSocketManager.getInstance().broadcastTopicMessage({
            payload: { topic, message: payload }
        });
    });
    subscriptionService.on("deviceCmd", (topic, payload) => {
        UHNAppServerWebSocketManager.getInstance().broadcastTopicMessage({
            payload: { topic, message: payload }
        });
    });
}
