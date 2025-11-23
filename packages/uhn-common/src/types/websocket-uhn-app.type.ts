import { UxpActionPayloadResponseMap, WebSocketAction, WebSocketMessage, WebSocketResponse } from "@uxp/common";
import { DocumentActionPayloadResponseMap, TopicActionPayloadRequestMap } from "./uhn-topics.type";

export type UHNAppActionPayloadRequestMap = TopicActionPayloadRequestMap;

export type UHNAppActionPayloadResponseMap = DocumentActionPayloadResponseMap & UxpActionPayloadResponseMap;

export type UHNAppRequestMessage<Action extends WebSocketAction<UHNAppActionPayloadRequestMap>> = WebSocketMessage<Action, UHNAppActionPayloadRequestMap>;
export type UHNAppResponseMessage<Action extends WebSocketAction<UHNAppActionPayloadResponseMap>> = WebSocketResponse<Action, UHNAppActionPayloadResponseMap>;