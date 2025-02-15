import { WebSocketMessage } from "@uxp/common";

export type ChatAction = "join_room" | "leave_room" | "send_message" | "user_joined" | "user_left" | "new_message";

export type ChatWebSocketMessage <Payload extends ChatPayload>= WebSocketMessage<ChatAction, Payload>;

export interface ChatPayload {
    room: string
}
export interface JoinRoomPayload extends ChatPayload { };
export interface LeaveRoomPayload extends ChatPayload { };
export interface SendMessagePayload extends ChatPayload { text: string };
export interface UserJoinedPayload extends ChatPayload { username: string };
export interface UserLeftPayload extends ChatPayload { username: string };
export interface NewMessagePayload extends ChatPayload { username: string; text: string; timestamp: string };
