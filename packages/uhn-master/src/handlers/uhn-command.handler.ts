import { UHNAppRequestMessage, UhnResourceCommandPayloadSchema } from "@uhn/common";
import { AppLogger, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { CommandsResourceService } from "../services/command-resource.service";


export class UhnCommandHandler {
    private commandService: CommandsResourceService;
    constructor() {
        this.commandService = new CommandsResourceService();
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