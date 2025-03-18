import exp from "constants";
import { DocumentActionPayloadRequestMap, DocumentActionPayloadResponseMap } from "./document.types";
import { WebSocketAction, WebSocketMessage, WebSocketResponse } from "@uxp/common";

export type H2CAppActionPayloadRequestMap = DocumentActionPayloadRequestMap;

export type H2CAppActionPayloadResponseMap = DocumentActionPayloadResponseMap;

export  type H2CAppRequestMessage<Action extends WebSocketAction<H2CAppActionPayloadRequestMap>> = WebSocketMessage<Action, H2CAppActionPayloadRequestMap>;
export  type H2CAppResponseMessage<Action extends WebSocketAction<H2CAppActionPayloadResponseMap>> = WebSocketResponse<Action, H2CAppActionPayloadResponseMap>;