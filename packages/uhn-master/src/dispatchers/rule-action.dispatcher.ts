/**
 * Dispatches RuntimeRuleActions emitted by the master's rule runtime to
 * the appropriate edge services.
 *
 * - setOutput  → sends a write command to the owning edge via MQTT
 * - emitSignal → publishes a transient signal override to the owning edge
 * - timerStart / timerClear → forwards timer commands to the owning edge,
 *   which runs the actual timer and publishes state back via MQTT
 */
import { RuntimeRuleAction } from "@uhn/blueprint";
import { RuntimeDigitalOutputResource } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { assertNever } from "@uxp/common";
import { blueprintResourceService } from "../services/blueprint-resource.service";
import { commandEdgeService } from "../services/command-edge.service";
import { muteEdgeService } from "../services/mute-edge.service";
import { ruleRuntimeProcessService } from "../services/rule-runtime-process.service";
import { stateSignalService } from "../services/state-signal.service";
import { timerEdgeService } from "../services/timer-edge.service";


let initialized = false;

function handleActionEvent(actions: RuntimeRuleAction[]) {
    // Handle the action event here
    AppLogger.info({
        message: `Action event received: ${JSON.stringify(actions)}`
    });
    actions.forEach(act => {
        switch (act.type) {
            case "setOutput":
                handleSetOutputAction(act);
                break;
            case "emitSignal":
                handleEmitSignalAction(act);
                break;
            case "timerStart":
                handleTimerStartAction(act);
                break;
            case "timerClear":
                handleTimerClearAction(act);
                break;
            case "mute":
                handleMuteAction(act);
                break;
            case "clearMute":
                handleClearMuteAction(act);
                break;
            default:
                assertNever(act);
        }
    });

}

function handleSetOutputAction(action: Extract<RuntimeRuleAction, { type: "setOutput" }>) {
    const resource = blueprintResourceService.getResourceById(action.resourceId)
    if (resource?.type === "digitalOutput") {
        commandEdgeService.sendCommandToEdge(resource as RuntimeDigitalOutputResource, {
            type: "set",
            value: action.value ?? false,
        });
        return;
    }
    AppLogger.warn({
        message: `SetOutput action received for non-output resource: ${action.resourceId}`
    });
}
function handleEmitSignalAction(action: Extract<RuntimeRuleAction, { type: "emitSignal" }>) {
    const resource = blueprintResourceService.getResourceById(action.resourceId)
    if (resource?.type === "digitalInput") {
        stateSignalService.setSignalState(resource, action.value ?? false);
        return
    }
    AppLogger.warn({
        message: `EmitSignal action received for non-input resource: ${action.resourceId}`
    });

}

function handleTimerStartAction(action: Extract<RuntimeRuleAction, { type: "timerStart" }>) {
    const resource = blueprintResourceService.getResourceById(action.resourceId);
    if (resource?.type === "timer") {
        timerEdgeService.sendTimerCommandToEdge(resource, {
            action: "start",
            durationMs: action.durationMs,
            mode: action.mode,
        });
        return;
    }
    AppLogger.warn({
        message: `TimerStart action received for non-timer resource: ${action.resourceId}`
    });
}

function handleTimerClearAction(action: Extract<RuntimeRuleAction, { type: "timerClear" }>) {
    const resource = blueprintResourceService.getResourceById(action.resourceId);
    if (resource?.type === "timer") {
        timerEdgeService.sendTimerCommandToEdge(resource, { action: "clear" });
        return;
    }
    AppLogger.warn({
        message: `TimerClear action received for non-timer resource: ${action.resourceId}`
    });
}

function handleMuteAction(action: Extract<RuntimeRuleAction, { type: "mute" }>) {
    muteEdgeService.broadcastMuteCommand({
        targetType: action.targetType,
        targetId: action.targetId,
        action: "mute",
        expiresAt: action.expiresAt,
        identifier: action.identifier,
    });
}

function handleClearMuteAction(action: Extract<RuntimeRuleAction, { type: "clearMute" }>) {
    muteEdgeService.broadcastMuteCommand({
        targetType: action.targetType,
        targetId: action.targetId,
        action: "clearMute",
        identifier: action.identifier,
    });
}

export function initRuleActionDispatcher(): void {
    if (initialized) return;
    initialized = true;

    ruleRuntimeProcessService.on("onActionEvent", (event) => {
        setImmediate(() => {
            handleActionEvent(event.actions);
        });
    });
}

