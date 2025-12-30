import { AppLogger } from "@uxp/bff-common";
import { ResourceStateValue, RuntimeResourceState } from "packages/uhn-common/src/types/uhn-runtime.type";
import { ruleRuntimeProcessService } from "../services/rule-runtime-process.service";
import { stateRuntimeService } from "../services/state-runtime.service";
import { UHNAppServerWebSocketManager } from "../ws/UHNAppServerWebSocketManager";

let initialized = false;


function sendFullStateUpdateToRuleRuntime(states: RuntimeResourceState[]) {
    if (!ruleRuntimeProcessService.canSendCommands()) {
        return;
    }

    try {
        ruleRuntimeProcessService.sendEvent({ cmd: "stateFullUpdate", payload: states });

    } catch (error) {
        AppLogger.error({
            message: `[RuleRuntimeStateService] Failed to send full state update to rule runtime:`,
            error,
        });
    }
}
function clearStatesFromRuleRuntime() {
    if (!ruleRuntimeProcessService.canSendCommands()) {
        return;
    }
    try {
        ruleRuntimeProcessService.sendEvent({ cmd: "stateFullUpdate", payload: [] });

    } catch (error) {
        AppLogger.error({
            message: `[RuleRuntimeStateService] Failed to clear states:`,
            error,
        });
    }
}
function sendStateUpdateToRuleRuntime(resourceId: string, value: ResourceStateValue | undefined, timestamp: number) {
    if (!ruleRuntimeProcessService.canSendCommands()) {
        return;
    }
    try {
        ruleRuntimeProcessService.sendEvent({ cmd: "stateUpdate", payload: { resourceId, value, timestamp } });
    } catch (error) {
        AppLogger.error({
            message: `[RuleRuntimeStateService] Failed to send state update for resource ${resourceId} to rule runtime:`,
            error,
        });
    }
}

export function initStateRuntimeDispatcher(): void {
    if (initialized) return;
    initialized = true;
    const ws = UHNAppServerWebSocketManager.getInstance();

    stateRuntimeService.on("runtimeStateChanged", (resourceId, stateValue, timestamp) => {
        sendStateUpdateToRuleRuntime(resourceId, stateValue, timestamp);
        ws.broadcastRuntimeStateMessage({
            state: { resourceId, value: stateValue, timestamp }
        });
    });
    stateRuntimeService.on("runtimeStatesChanged", (states) => {
        sendFullStateUpdateToRuleRuntime(states);
        ws.broadcastRuntimeStatesMessage({
            states: [...states]
        });
    });
    stateRuntimeService.on("runtimeStateReset", () => {
        clearStatesFromRuleRuntime();
        ws.broadcastRuntimeStatesMessage({
            states: []
        });
    });



}