import { WebSocketAction, WebSocketMessage, WebSocketResponse } from "@uxp/common";
import { AsyncWSDemoActionPayloadRequestMap, AsyncWSDemoActionPayloadResponseMap } from "./async-ws-demo.type";
import { BinaryDemoActionPayloadRequestMap, BinaryDemoActionPayloadResponseMap } from "./binary-demo.type";
import { ChatDemoActionPayloadRequestMap, ChatDemoActionPayloadResponseMap } from "./chat-demo.type";

export type DemoAppActionPayloadRequestMap = BinaryDemoActionPayloadRequestMap &
    AsyncWSDemoActionPayloadRequestMap &
    ChatDemoActionPayloadRequestMap;

export type DemoAppActionPayloadResponseMap = BinaryDemoActionPayloadResponseMap &
    AsyncWSDemoActionPayloadResponseMap &
    ChatDemoActionPayloadResponseMap;

export type DemoAppRequestMessage<Action extends WebSocketAction<DemoAppActionPayloadRequestMap>> = WebSocketMessage<Action, DemoAppActionPayloadRequestMap>;
export type DemoAppResponseMessage<Action extends WebSocketAction<DemoAppActionPayloadResponseMap>> = WebSocketResponse<Action, DemoAppActionPayloadResponseMap>;
