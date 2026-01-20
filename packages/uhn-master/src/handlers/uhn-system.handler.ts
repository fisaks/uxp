import { UHNAppRequestMessage, UhnSystemCommandSchema } from "@uhn/common";
import { AppLogger, UseQueryRunner, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { SystemCommandsService } from "../services/uhn-system.service";

export class UhnSystemHandler {

    private systemCommandsService: SystemCommandsService;

    constructor() {
        this.systemCommandsService = new SystemCommandsService();

    }

    @WebSocketAction("uhn:system:command", { authenticate: true, schema: UhnSystemCommandSchema })
    
    public async systemCommand(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"uhn:system:command">
    ) {
        AppLogger.info(wsDetails.requestMeta, {
            message: `Received system command: ${message.payload.command}`,
            object: message.payload,
        });

        this.systemCommandsService.runCommand(message.payload);
    }
}
