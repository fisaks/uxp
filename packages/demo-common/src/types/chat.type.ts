import { SchemaValidate, WebSocketMessage, WebSocketResponse } from "@uxp/common";

export type ClientChatActions = "send_message" | "join_room" | "leave_room";

// Actions the server sends to the client
export type ServerChatActions = "new_message" | "user_joined" | "user_left";

export type ChatWebSocketMessage<Action extends keyof ClientChatActionPayloadMap> = WebSocketMessage<Action, ClientChatActionPayloadMap>;
export type ChatWebSocketResponse<Action extends keyof ServerChatActionPayloadMap> = WebSocketResponse<Action, ServerChatActionPayloadMap>;

export interface ChatPayload {
    room: string
}
export interface JoinRoomPayload extends ChatPayload { };
export interface LeaveRoomPayload extends ChatPayload { };
export interface SendMessagePayload extends ChatPayload { text: string };
export interface UserJoinedPayload extends ChatPayload { username: string };
export interface UserLeftPayload extends ChatPayload { username: string };
export interface NewMessagePayload extends ChatPayload { username: string; text: string; timestamp: string };
export type ClientChatPayloads = {
    send_message: SendMessagePayload;
    join_room: JoinRoomPayload;
    leave_room: LeaveRoomPayload;
};

export type ServerChatPayloads = {
    new_message: NewMessagePayload;
    user_joined: UserJoinedPayload
    user_left: UserLeftPayload
};
// Create a type that maps actions to payloads dynamically

export type ClientChatActionPayloadMap = {
    [A in ClientChatActions]: ClientChatPayloads[A];
};

export type ServerChatActionPayloadMap = {
    [A in ServerChatActions]: ServerChatPayloads[A];
};

export const SendMessageSchema ={

    type: 'object',
    properties: {
        room: { type: 'string', maxLength: 25 },
        text: {
            type: 'string',
            maxLength: 500,
            pattern: '^[a-zA-Z0-9 .,?!]*$' // Only normal Latin characters, spaces, and common punctuation
        },
    },
    required: ['room', 'text']

}

export const JoinRoomchema = {

    type: 'object',
    properties: {
        room: { type: 'string', maxLength: 25 },
    },
    required: ['room']

}
export const LeaveRoomchema = JoinRoomchema;