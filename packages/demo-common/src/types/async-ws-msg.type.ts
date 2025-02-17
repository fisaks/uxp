import { WebSocketMessage, WebSocketResponse } from "@uxp/common";

export type AsyncWSMsgActions = "test_async_message"


export type ClientAsyncWSMsgWebSocketMessage<Action extends keyof ClientAsyncWSMsgActionPayloadMap> = WebSocketMessage<Action, ClientAsyncWSMsgActionPayloadMap>;
export type ServerAsyncWSMsgWebSocketMessage<Action extends keyof ServerAsyncWSMsgActionPayloadMap> = WebSocketResponse<Action, ServerAsyncWSMsgActionPayloadMap>;


export interface ClientAsyncWSMsgPayload {
    waitTimeMs: number
    responseType: "success" | "error"
}
export interface ServerAsyncWSMsgPayload {
    text: string
}

export type ClientAsyncWSMsgPayloads = {
    test_async_message: ClientAsyncWSMsgPayload;
};

export type ServerAsyncWSMsgPayloads = {
    test_async_message: ServerAsyncWSMsgPayload;
};

// Create a type that maps actions to payloads dynamically

export type ClientAsyncWSMsgActionPayloadMap = {
    [A in AsyncWSMsgActions]: ClientAsyncWSMsgPayloads[A];
};
export type ServerAsyncWSMsgActionPayloadMap = {
    [A in AsyncWSMsgActions]: ServerAsyncWSMsgPayloads[A];
};



export const AsyncWSMsgSchema = {

    type: 'object',
    properties: {
        waitTimeMs: { type: 'number', minimum: 0, maximum: 10000 },
        responseType: { type: 'string', enum: ["success", "error"] },
    },
    required: ['waitTimeMs', 'responseType']

}