import { UHNAppRequestMessage, UhnResourceCommandPayloadSchema, UhnSubscribePayloadSchema } from "@uhn/common";
import { AppLogger, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { BlueprintResourceCommandService } from "../services/blueprint-resource-command.service";
import { UhnMessageService } from "../services/uhn-message.service";

export class UhnMessageHandler {

    private uhnMessageService: UhnMessageService;
    private commandService: BlueprintResourceCommandService;
    constructor() {
        this.uhnMessageService = new UhnMessageService();
        this.commandService = new BlueprintResourceCommandService();
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

    @WebSocketAction("uhn:resource:command", { authenticate: true, schema: UhnResourceCommandPayloadSchema })
    public async resourceCommand(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"uhn:resource:command">
    ) {

        const { id, payload } = message;
        AppLogger.info(wsDetails.requestMeta, {
            message: `Executing resource command: ${payload.resourceId} with command type ${payload.command.type}`
        });
        await this.commandService.executeResourceCommand(payload.resourceId, payload.command);
        return id ? message : undefined;

    }

}