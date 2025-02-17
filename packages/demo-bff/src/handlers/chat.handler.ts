import { ChatWebSocketMessage, JoinRoomchema, LeaveRoomchema, SendMessageSchema } from "@demo/common";
import { WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { ChatService } from "../services/chat.service";

export class ChatHandler {
    private chatService = new ChatService();

    @WebSocketAction("join_room", { authenticate: true, schema: JoinRoomchema })
    public async handleJoinRoom(wsDetails: WebSocketDetails, message: ChatWebSocketMessage<"join_room">) {

        return this.chatService.handleJoinRoom(wsDetails, message);
    }

    @WebSocketAction("leave_room", { authenticate: true, schema: LeaveRoomchema })
    public async handleLeaveRoom(wsDetails: WebSocketDetails, message: ChatWebSocketMessage<"leave_room">) {
        return this.chatService.handleLeaveRoom(wsDetails, message);
    }

    @WebSocketAction("send_message", { authenticate: true, schema: SendMessageSchema })
    public async handleSendMessage(wsDetails: WebSocketDetails, message: ChatWebSocketMessage<"send_message">) {
        return this.chatService.handleSendMessage(wsDetails, message);
    }
}
