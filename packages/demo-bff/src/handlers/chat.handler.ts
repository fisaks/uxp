import { ChatWebSocketMessage, JoinRoomPayload, LeaveRoomPayload, SendMessagePayload } from "@demo/common";
import { WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { ChatService } from "../services/chat.service";

export class ChatHandler {
    private chatService = new ChatService();

    @WebSocketAction("join_room", { authenticate: true })
    public async handleJoinRoom(wsDetails: WebSocketDetails, message: ChatWebSocketMessage<JoinRoomPayload>) {
        return this.chatService.handleJoinRoom(wsDetails, message);
    }

    @WebSocketAction("leave_room", { authenticate: true })
    public async handleLeaveRoom(wsDetails: WebSocketDetails, message: ChatWebSocketMessage<LeaveRoomPayload>) {
        return this.chatService.handleLeaveRoom(wsDetails, message);
    }

    @WebSocketAction("send_message", { authenticate: true })
    public async handleSendMessage(wsDetails: WebSocketDetails, message: ChatWebSocketMessage<SendMessagePayload>) {
        return this.chatService.handleSendMessage(wsDetails, message);
    }
}
