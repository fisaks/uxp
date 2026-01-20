import { UxpActionPayloadResponseMap, WebSocketAction, WebSocketMessage, WebSocketResponse } from "@uxp/common";
import { UhnHealthPayloadResponseMap, UhnResourcePayloadRequestMap, UhnResourcePayloadResponseMap, UhnSubscribePayloadRequestMap, UhnSubscribePayloadResponseMap } from "./uhn-message.type";
import { TopicActionPayloadRequestMap, TopicActionPayloadResponseMap } from "./uhn-topics.type";
import { UhnSystemPayloadRequestMap, UhnSystemPayloadResponseMap } from "./uhn-system.type";

// Request maps
export type UHNAppActionPayloadRequestMap = TopicActionPayloadRequestMap &
    UhnSubscribePayloadRequestMap & UhnResourcePayloadRequestMap & UhnSystemPayloadRequestMap;

export type UHNHealthActionPayloadRequestMap = UhnSubscribePayloadRequestMap;

export type UHNSystemActionPayloadRequestMap = UhnSubscribePayloadRequestMap & UhnSystemPayloadRequestMap;

// Response maps
export type UHNAppActionPayloadResponseMap = TopicActionPayloadResponseMap &
    UhnSubscribePayloadResponseMap &
    UhnResourcePayloadResponseMap &
    UhnHealthPayloadResponseMap &
    UhnSystemPayloadResponseMap &
    UxpActionPayloadResponseMap;

export type UHNHealthActionPayloadResponseMap = UhnSubscribePayloadResponseMap &
    UhnHealthPayloadResponseMap &
    UxpActionPayloadResponseMap;

export type UHNSystemActionPayloadResponseMap = UhnSubscribePayloadResponseMap &
    UhnSystemPayloadResponseMap &
    UxpActionPayloadResponseMap;

export type UHNAppRequestMessage<Action extends WebSocketAction<UHNAppActionPayloadRequestMap>> =
    WebSocketMessage<Action, UHNAppActionPayloadRequestMap>;
export type UHNAppResponseMessage<Action extends WebSocketAction<UHNAppActionPayloadResponseMap>> =
    WebSocketResponse<Action, UHNAppActionPayloadResponseMap>;

export type UHNHealthRequestMessage<Action extends WebSocketAction<UHNHealthActionPayloadRequestMap>>
    = WebSocketMessage<Action, UHNHealthActionPayloadRequestMap>;
export type UHNHealthResponseMessage<Action extends WebSocketAction<UHNHealthActionPayloadResponseMap>>
    = WebSocketResponse<Action, UHNHealthActionPayloadResponseMap>;

export type UHNSystemRequestMessage<Action extends WebSocketAction<UHNSystemActionPayloadRequestMap>>
    = WebSocketMessage<Action, UHNSystemActionPayloadRequestMap>;
export type UHNSystemResponseMessage<Action extends WebSocketAction<UHNSystemActionPayloadResponseMap>>
    = WebSocketResponse<Action, UHNSystemActionPayloadResponseMap>;    