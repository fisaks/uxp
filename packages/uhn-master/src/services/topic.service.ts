import { WebSocket } from "ws";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

export class TopicService {

    private wsManager = UHNAppServerWebSocketManager.getInstance();

    async subscribeToTopicPattern(socket: WebSocket, topicPattern: string) {

        this.wsManager.subscribeToTopicPattern(socket, topicPattern);
        return;
    }

    async unsubscribeFromTopicPattern(socket: WebSocket, topicPattern: string) {
        this.wsManager.unsubscribeFromTopicPattern(socket, topicPattern);
    }

}