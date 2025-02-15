import { ErrorDetail } from "../error/error.types";


export type WebSocketMessage<Action = string, Payload = unknown> = {
    action: Action;
    id?: string;
    payload: Payload;
};

export type WebSocketResponse<Action = string, Payload = unknown> = {
    action: Action;
    id?: string;
    success: boolean;
    payload?: Payload;
    error?: ErrorDetail
    errorDetails?: object
}

