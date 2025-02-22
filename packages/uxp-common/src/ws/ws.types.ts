import { ErrorDetail } from "../error/error.types";

export const MAGIC_BINARY_PREFIX = "BIN!";

// Represents both request & response actions
export type WebSocketActionUnion<ActionPayloadMapRequestMap, ActionPayloadResponseMap> =
    WebSocketAction<ActionPayloadMapRequestMap> | WebSocketAction<ActionPayloadResponseMap>;

// Represents a single action type (either request OR response)
export type WebSocketAction<ActionPayloadMap> =
    Extract<keyof ActionPayloadMap, string>;


export type WebSocketMessage<Action extends WebSocketAction<ActionPayloadMap>,
    ActionPayloadMap extends { [K in keyof ActionPayloadMap]: ActionPayloadMap[K] }> = {
        action: Action;
        id?: string;
        payload: ActionPayloadMap[Action];
    }

export type WebSocketResponse<Action extends WebSocketAction<ActionPayloadMap>,
    ActionPayloadMap extends { [K in keyof ActionPayloadMap]: ActionPayloadMap[K] }> = {
        action: Action;
        id?: string;
        success: boolean;
        payload?: ActionPayloadMap[Action];
        error?: ErrorDetail
        errorDetails?: object
    }

export type GenericActionPayloadMap = {
    [key: string]: unknown
}

export type GenericWebSocketMessage = WebSocketMessage<string, GenericActionPayloadMap>
export type GenericWebSocketResponse = WebSocketResponse<string, GenericActionPayloadMap>
