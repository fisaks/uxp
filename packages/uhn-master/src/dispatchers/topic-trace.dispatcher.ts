import { subscriptionService } from "../services/subscription.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

export class TopicTraceDispatcher {
    private static initialized = false;
    constructor() {
        if (TopicTraceDispatcher.initialized) {
            return;
        }
        TopicTraceDispatcher.initialized = true;
        subscriptionService.on("deviceState", (topic, payload) => {
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
}