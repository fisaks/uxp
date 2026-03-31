import { UxpHealthPayloadResponseMap, UxpSubscribePayloadRequestMap, UxpSubscribePayloadResponseMap } from "@uxp/common";
import { BrowserWebSocketManager, ErrorHandler, WebSocketResponseListenerObj } from "@uxp/ui-lib";

export type UxpActionPayloadRequestMap = UxpSubscribePayloadRequestMap;
export type UxpActionPayloadResponseMap = UxpSubscribePayloadResponseMap & UxpHealthPayloadResponseMap;

export type UxpWebSocketResponseListener = WebSocketResponseListenerObj<UxpActionPayloadResponseMap>;
export type UxpErrorHandler = ErrorHandler<UxpActionPayloadRequestMap, UxpActionPayloadResponseMap>;

export class UxpBrowserWebSocketManager extends BrowserWebSocketManager<UxpActionPayloadRequestMap, UxpActionPayloadResponseMap> {
    private static instance: UxpBrowserWebSocketManager | null = null;

    private constructor() {
        super("/ws-api");
    }

    static getInstance(): UxpBrowserWebSocketManager {
        if (!this.instance) {
            this.instance = new UxpBrowserWebSocketManager();
        }
        return this.instance;
    }
}
