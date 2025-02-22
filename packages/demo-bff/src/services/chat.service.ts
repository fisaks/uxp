import { DemoAppActionPayloadResponseMap, DemoAppRequestMessage, } from "@demo/common";
import { WebSocketDetails } from "@uxp/bff-common";
import { DemoAppServerWebSocketManager } from "../ws/DemoAppServerWebSocketManager";


export class ChatService {
    private wsManager = DemoAppServerWebSocketManager.getInstance();

    public handleJoinRoom(wsDetails: WebSocketDetails, message: DemoAppRequestMessage<"join_room">): { message: string } {

        const { room } = message.payload;
        this.wsManager.joinTopic(wsDetails.socket, room);

        this.wsManager.broadcastToTopic(room, { action: "user_joined", success: true, payload: { room, username: wsDetails.user?.username! } });
        return { message: `Joined room: ${room}` };
    }

    public handleLeaveRoom(wsDetails: WebSocketDetails, message: DemoAppRequestMessage<"leave_room">): { message: string } {

        const { room } = message.payload;
        this.wsManager.leaveTopic(wsDetails.socket, room);
        this.wsManager.broadcastToTopic(room, { action: "user_left", success: true, payload: { room, username: wsDetails.user?.username! } });

        return { message: `Left room: ${room}` };
    }

    public handleSendMessage(wsDetails: WebSocketDetails, message: DemoAppRequestMessage<"send_message">): { message: string } {

        const { room, text } = message.payload;
        const payload: DemoAppActionPayloadResponseMap["new_message"] = {
            room,
            username: wsDetails.user?.username!,
            text,
            timestamp: new Date().toISOString()
        };

        this.wsManager.broadcastToTopic(room, { action: "new_message", success: true, payload });

        return { message: "Message sent successfully" };
    }
}
