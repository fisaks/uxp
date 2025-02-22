import { ChatJoinRoomchema, ChatLeaveRoomchema, ChatSendMessageSchema, DemoAppRequestMessage } from "@demo/common";
import { WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { ChatService } from "../services/chat.service";

export class ChatHandler {
    private chatService = new ChatService();

    @WebSocketAction("join_room", { authenticate: true, schema: ChatJoinRoomchema })
    public async handleJoinRoom(wsDetails: WebSocketDetails, message: DemoAppRequestMessage<"join_room">) {

        return this.chatService.handleJoinRoom(wsDetails, message);
    }

    @WebSocketAction("leave_room", { authenticate: true, schema: ChatLeaveRoomchema })
    public async handleLeaveRoom(wsDetails: WebSocketDetails, message: DemoAppRequestMessage<"leave_room">) {
        return this.chatService.handleLeaveRoom(wsDetails, message);
    }

    @WebSocketAction("send_message", { authenticate: true, schema: ChatSendMessageSchema })
    public async handleSendMessage(wsDetails: WebSocketDetails, message: DemoAppRequestMessage<"send_message">) {
        return this.chatService.handleSendMessage(wsDetails, message);
    }
}
