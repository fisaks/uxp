import { RuleRuntimeTimerCommand } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";

export function handleTimerCommand({ timerService, runMode }: RuleRuntimeDependencies, cmd: RuleRuntimeTimerCommand) {
    if (runMode !== "edge") {
        runtimeOutput.log({
            component: "handleTimerCommand",
            level: "warn",
            message: `timerCommand received in ${runMode} mode — timer commands should only be sent to edge runtimes`,
        });
        return;
    }

    const { resourceId, action, durationMs, mode } = cmd.payload;

    // Build a minimal timer resource for the service API
    const timerResource = { id: resourceId, type: "timer" as const, edge: "" };

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
