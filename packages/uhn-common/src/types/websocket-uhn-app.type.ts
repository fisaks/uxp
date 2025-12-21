import { UxpActionPayloadResponseMap, WebSocketAction, WebSocketMessage, WebSocketResponse } from "@uxp/common";
import { TopicActionPayloadRequestMap, TopicActionPayloadResponseMap } from "./uhn-topics.type";
import { UhnMessageActionPayloadRequestMap, UhnMessageActionPayloadResponseMap } from "./uhn-message.type";

export type UHNAppActionPayloadRequestMap = TopicActionPayloadRequestMap &
    UhnMessageActionPayloadRequestMap;

export type UHNAppActionPayloadResponseMap = TopicActionPayloadResponseMap &
    UhnMessageActionPayloadResponseMap &
    UxpActionPayloadResponseMap;

export type UHNAppRequestMessage<Action extends WebSocketAction<UHNAppActionPayloadRequestMap>> = WebSocketMessage<Action, UHNAppActionPayloadRequestMap>;
export type UHNAppResponseMessage<Action extends WebSocketAction<UHNAppActionPayloadResponseMap>> = WebSocketResponse<Action, UHNAppActionPayloadResponseMap>;