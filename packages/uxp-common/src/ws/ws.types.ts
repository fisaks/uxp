import { ErrorDetail } from "../error/error.types";


export type WebSocketMessage<Action extends keyof ActionPayloadMap,
    ActionPayloadMap extends { [K in keyof ActionPayloadMap]: ActionPayloadMap[K] }> = {
        action: Action;
        id?: string;
        payload: ActionPayloadMap[Action];
    };

export type WebSocketResponse<Action extends keyof ActionPayloadMap,
    ActionPayloadMap extends { [K in keyof ActionPayloadMap]: ActionPayloadMap[K] }> = {
        action: Action;
        id?: string;
        success: boolean;
        payload?: ActionPayloadMap[Action];
        error?: ErrorDetail
        errorDetails?: object
    }

export type GenericWebSocketMessage = {
    action: string;
    id?: string;
    payload: unknown;
}

export type GenericWebSocketResponse = {
    action: string;
    id?: string;
    success: boolean;
    payload?: unknown;
    error?: ErrorDetail
    errorDetails?: object
}