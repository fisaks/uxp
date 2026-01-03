import { UxpActionPayloadResponseMap, WebSocketAction, WebSocketMessage, WebSocketResponse } from "@uxp/common";
import { UhnHealthPayloadResponseMap, UhnResourcePayloadRequestMap, UhnResourcePayloadResponseMap, UhnSubscribePayloadRequestMap, UhnSubscribePayloadResponseMap } from "./uhn-message.type";
import { TopicActionPayloadRequestMap, TopicActionPayloadResponseMap } from "./uhn-topics.type";

export type UHNAppActionPayloadRequestMap = TopicActionPayloadRequestMap &
    UhnSubscribePayloadRequestMap & UhnResourcePayloadRequestMap;

export type UHNHealthActionPayloadRequestMap = UhnSubscribePayloadRequestMap;

export type UHNAppActionPayloadResponseMap = TopicActionPayloadResponseMap &
    UhnSubscribePayloadResponseMap &
    UhnResourcePayloadResponseMap &
    UhnHealthPayloadResponseMap &
    UxpActionPayloadResponseMap;

export type UHNHealthActionPayloadResponseMap = UhnSubscribePayloadResponseMap &
    UhnHealthPayloadResponseMap &
    UxpActionPayloadResponseMap;

export type UHNAppRequestMessage<Action extends WebSocketAction<UHNAppActionPayloadRequestMap>> =
    WebSocketMessage<Action, UHNAppActionPayloadRequestMap>;
export type UHNAppResponseMessage<Action extends WebSocketAction<UHNAppActionPayloadResponseMap>> =
    WebSocketResponse<Action, UHNAppActionPayloadResponseMap>;

export type UHNHealthRequestMessage<Action extends WebSocketAction<UHNHealthActionPayloadRequestMap>>
    = WebSocketMessage<Action, UHNHealthActionPayloadRequestMap>;
export type UHNHealthResponseMessage<Action extends WebSocketAction<UHNHealthActionPayloadResponseMap>>
    = WebSocketResponse<Action, UHNHealthActionPayloadResponseMap>;