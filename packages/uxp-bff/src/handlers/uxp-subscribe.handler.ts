import { WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { UxpSubscribePayload, UxpSubscribePayloadSchema } from "@uxp/common";
import { uxpMessageService } from "../services/uxp-message.service";

export class UxpSubscribeHandler {

    @WebSocketAction("uxp:subscribe", { authenticate: true, schema: UxpSubscribePayloadSchema })
    public async subscribe(
        wsDetails: WebSocketDetails,
        message: { payload: UxpSubscribePayload },
    ) {
        uxpMessageService.subscribe(wsDetails.socket, message.payload.patterns);
    }

    @WebSocketAction("uxp:unsubscribe", { authenticate: true, schema: UxpSubscribePayloadSchema })
    public async unsubscribe(
        wsDetails: WebSocketDetails,
        message: { payload: UxpSubscribePayload },
    ) {
        uxpMessageService.unsubscribe(wsDetails.socket, message.payload.patterns);
    }
}
