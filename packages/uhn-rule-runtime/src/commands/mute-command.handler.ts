import { RuleRuntimeMuteCommand } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";

export function handleMuteCommand({ muteService }: RuleRuntimeDependencies, cmd: RuleRuntimeMuteCommand) {
    const { targetType, targetId, action, expiresAt, identifier } = cmd.payload;

    switch (action) {
        case "mute": {
            if (expiresAt === undefined) {
                runtimeOutput.log({
                    component: "handleMuteCommand",
                    level: "error",
                    message: `muteCommand mute missing expiresAt for ${targetType} ${targetId}`,
                });
                return;
            }
            muteService.setMuteUntil(targetType, targetId, expiresAt, identifier);
            break;
        }
        case "clearMute": {
            muteService.clearMuteEntries(targetType, targetId, identifier);
            break;
        }
        default:
            runtimeOutput.log({
                component: "handleMuteCommand",
                level: "error",
                message: `Unknown mute action: ${action}`,
            });
    }
}
