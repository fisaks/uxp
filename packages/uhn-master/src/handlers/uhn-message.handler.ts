import { UHNAppRequestMessage, UhnSubscribePayloadSchema } from "@uhn/common";
import { AppLogger, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { UhnMessageService } from "../services/uhn-message.service";

export class UhnMessageHandler {

    private uhnMessageService: UhnMessageService;
    constructor() {
        this.uhnMessageService = new UhnMessageService();
    }

    @WebSocketAction("uhn:subscribe", { authenticate: true, schema: UhnSubscribePayloadSchema })
    public async subscribeToPatterns(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"uhn:subscribe">
    ) {

        const { id, payload } = message;
        AppLogger.info(wsDetails.requestMeta, {
            message: `Subscribing to uhn pattern: ${payload.patterns}`
        });
        await this.uhnMessageService.subscribeToPatterns(wsDetails.socket, payload.patterns, id);
    }

    @WebSocketAction("uhn:unsubscribe", { authenticate: true, schema: UhnSubscribePayloadSchema })
    public async unsubscribeFromPatterns(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"uhn:unsubscribe">
    ) {

        const { id, payload } = message;
        AppLogger.info(wsDetails.requestMeta, {
            message: `Unsubscribing from uhn pattern: ${payload.patterns}`
        });
        await this.uhnMessageService.unsubscribeFromPatterns(wsDetails.socket, payload.patterns, id);

    }

}