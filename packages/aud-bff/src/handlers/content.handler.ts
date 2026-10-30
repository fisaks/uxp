import { WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { contentChangeService } from "../content/content-change.service";

export class ContentHandler {
    @WebSocketAction("content_subscribe", { authenticate: true })
    public subscribe(wsDetails: WebSocketDetails) {
        return contentChangeService.subscribe(wsDetails.socket);
    }
}
