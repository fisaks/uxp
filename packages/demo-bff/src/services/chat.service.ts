import { ChatAction, ChatPayload, ChatWebSocketMessage, JoinRoomPayload, LeaveRoomPayload, NewMessagePayload, SendMessagePayload, UserJoinedPayload, UserLeftPayload } from "@demo/common";
import { WebSocketDetails, WebSocketStore } from "@uxp/bff-common";


export class ChatService {
    private wsStore = WebSocketStore.getInstance();

    public handleJoinRoom(wsDetails: WebSocketDetails, message: ChatWebSocketMessage<JoinRoomPayload>): { message: string } {

        const { room } = message.payload;
        this.wsStore.joinTopic(wsDetails.socket, room);
      
        this.wsStore.broadcastToTopic<"user_joined", UserJoinedPayload>(room, "user_joined", { room, username: wsDetails.user?.username! });
        return { message: `Joined room: ${room}` };
    }

    public handleLeaveRoom(wsDetails: WebSocketDetails, message: ChatWebSocketMessage<LeaveRoomPayload>): { message: string } {

        const { room } = message.payload;
        this.wsStore.leaveTopic(wsDetails.socket, room);
        this.wsStore.broadcastToTopic<"user_left", UserLeftPayload>(room, "user_left", { room, username: wsDetails.user?.username! });

        return { message: `Left room: ${room}` };
    }

    public handleSendMessage(wsDetails: WebSocketDetails, message: ChatWebSocketMessage<SendMessagePayload>): { message: string } {

        const { room, text } = message.payload;
        const payload: NewMessagePayload = { room, username: wsDetails.user?.username!, text, timestamp: new Date().toISOString() };

        this.wsStore.broadcastToTopic<"new_message", NewMessagePayload>(room, "new_message", payload);

        return { message: "Message sent successfully" };
    }
}
