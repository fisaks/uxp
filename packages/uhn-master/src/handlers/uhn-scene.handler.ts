import { UHNAppRequestMessage, UhnSceneActivatePayloadSchema } from "@uhn/common";
import { AppLogger, WebSocketAction, WebSocketDetails } from "@uxp/bff-common";
import { commandSceneService } from "../services/command-scene.service";

export class UhnSceneHandler {

    @WebSocketAction("uhn:scene:activate", { authenticate: true, schema: UhnSceneActivatePayloadSchema })
    public async activateScene(
        wsDetails: WebSocketDetails,
        message: UHNAppRequestMessage<"uhn:scene:activate">
    ) {
        const { id, payload } = message;
        AppLogger.info(wsDetails.requestMeta, {
            message: `Activating scene: ${payload.sceneId}`
        });
        await commandSceneService.activateScene(payload.sceneId);
        return id ? message : undefined;
    }
}
