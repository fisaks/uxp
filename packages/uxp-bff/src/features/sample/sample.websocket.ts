import { WebSocket } from "@fastify/websocket";
import { WebSocketAction } from "../../decorator/websocket.decorator";

// Define schemas as constants
const joinRoomSchema = {
    type: "object",
    properties: {
        room: { type: "string" },
    },
    required: ["room"],
};

const sendMessageSchema = {
    type: "object",
    properties: {
        room: { type: "string" },
        message: { type: "string" },
    },
    required: ["room", "message"],
};

export class ChatHandler {
    private rooms: Map<string, Set<WebSocket>> = new Map();

    @WebSocketAction("join_room", {
        schema: joinRoomSchema,
    })
    async joinRoom(socket: WebSocket, payload: { room: string }) {
        const { room } = payload;

        if (!this.rooms.has(room)) {
            this.rooms.set(room, new Set());
        }

        this.rooms.get(room)!.add(socket);
        socket.send(JSON.stringify({ action: "joined_room", room }));

        console.log(`Socket joined room ${room}`);
    }

    @WebSocketAction("send_message", {
        schema: sendMessageSchema,
    })
    async sendMessage(socket: WebSocket, payload: { room: string; message: string }) {
        const { room, message } = payload;

        if (!this.rooms.has(room)) {
            throw new Error(`Room ${room} does not exist`);
        }

        const socketsInRoom = this.rooms.get(room)!;

        // Broadcast the message to all other sockets in the room
        for (const client of socketsInRoom) {
            if (client !== socket && client.readyState === WebSocket.OPEN) {
                client.send(
                    JSON.stringify({
                        action: "receive_message",
                        room,
                        message,
                        sender: socket,
                    })
                );
            }
        }

        console.log(`Message sent to room ${room}: ${message}`);
    }
}
