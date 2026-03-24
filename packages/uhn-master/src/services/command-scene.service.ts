import { RuntimeSceneCommand } from "@uhn/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { assertNever } from "@uxp/common";
import { blueprintSceneService } from "./blueprint-scene.service";
import { CommandsResourceService } from "./command-resource.service";

/**
 * Handles scene activation from the UI.
 *
 * Entry point: `uhn:scene:activate` WebSocket message
 *   → UhnSceneHandler.activateScene()
 *   → commandSceneService.activateScene(sceneId)
 *
 * Iterates a scene's commands and executes each via CommandsResourceService.
 */
class CommandSceneService {
    private commandsResourceService = new CommandsResourceService();

    async activateScene(sceneId: string): Promise<void> {
        const scene = blueprintSceneService.getSceneById(sceneId);
        if (!scene) {
            throw new AppErrorV2({
                statusCode: 404,
                code: "NOT_FOUND",
                message: `Scene with id "${sceneId}" not found`,
            });
        }

        AppLogger.info({
            message: `[CommandSceneService] Activating scene "${sceneId}" with ${scene.commands.length} command(s).`,
        });

        for (const cmd of scene.commands) {
            await this.executeSceneCommand(cmd);
        }
    }

    private async executeSceneCommand(cmd: RuntimeSceneCommand): Promise<void> {
        switch (cmd.type) {
            case "setDigitalOutput":
                return this.commandsResourceService.executeResourceCommand(cmd.resourceId, {
                    type: "set",
                    value: cmd.value,
                });
            case "setAnalogOutput":
                return this.commandsResourceService.executeResourceCommand(cmd.resourceId, {
                    type: "setAnalog",
                    value: cmd.value,
                });
            case "emitSignal":
                return this.commandsResourceService.executeResourceCommand(cmd.resourceId, {
                    type: "set",
                    value: cmd.value ?? false,
                });
            case "emitAction":
                return this.commandsResourceService.executeResourceCommand(cmd.resourceId, {
                    type: "action",
                    action: cmd.action,
                    metadata: cmd.metadata,
                });
            case "setActionOutput":
                return this.commandsResourceService.executeResourceCommand(cmd.resourceId, {
                    type: "setActionOutput",
                    action: cmd.action,
                });
            default:
                assertNever(cmd);
        }
    }
}

export const commandSceneService = new CommandSceneService();
