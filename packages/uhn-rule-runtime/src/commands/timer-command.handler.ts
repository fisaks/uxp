import { isLogicalResource, RuleRuntimeTimerCommand } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";

export function handleTimerCommand({ timerService, resourceService, runMode, edgeName }: RuleRuntimeDependencies, cmd: RuleRuntimeTimerCommand) {
    const { resourceId, action, durationMs, mode } = cmd.payload;

    const resource = resourceService.getById(resourceId);
    if (!resource || resource.type !== "timer" || !isLogicalResource(resource)) {
        runtimeOutput.log({
            component: "handleTimerCommand",
            level: "error",
            message: `Timer resource ${resourceId} not found or not a timer`,
        });
        return;
    }

    const localHost = runMode === "master" ? "master" : edgeName;
    if (resource.host !== localHost) {
        runtimeOutput.log({
            component: "handleTimerCommand",
            level: "warn",
            message: `Timer ${resourceId} is hosted on ${resource.host}, not on this runtime (${localHost}) — ignoring command`,
        });
        return;
    }

    const timerResource = { id: resourceId, type: "timer" as const, host: resource.host };

    switch (action) {
        case "start": {
            if (durationMs === undefined) {
                runtimeOutput.log({
                    component: "handleTimerCommand",
                    level: "error",
                    message: `timerCommand start missing durationMs for resource ${resourceId}`,
                });
                return;
            }
            if (mode === "startOnce" && timerService.isRunning(timerResource)) {
                runtimeOutput.log({
                    component: "handleTimerCommand",
                    level: "info",
                    message: `Timer ${resourceId} already running (startOnce), skipping`,
                });
                return;
            }
            timerService.start(timerResource, durationMs);
            runtimeOutput.log({
                component: "handleTimerCommand",
                level: "info",
                message: `Timer ${resourceId} started for ${durationMs}ms (mode: ${mode ?? "restart"})`,
            });
            break;
        }
        case "clear": {
            timerService.clear(timerResource);
            runtimeOutput.log({
                component: "handleTimerCommand",
                level: "info",
                message: `Timer ${resourceId} cleared`,
            });
            break;
        }
        default:
            runtimeOutput.log({
                component: "handleTimerCommand",
                level: "error",
                message: `Unknown timer action: ${action}`,
            });
    }
}
