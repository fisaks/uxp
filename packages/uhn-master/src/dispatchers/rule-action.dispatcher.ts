/**
 * Dispatches RuntimeRuleActions emitted by the master's rule runtime to
 * the appropriate edge services.
 *
 * - setDigitalOutput → sends a write command to the owning edge via MQTT
 * - emitSignal → publishes a transient signal override to the owning edge
 * - timerStart / timerClear → forwards timer commands to the owning edge,
 *   which runs the actual timer and publishes state back via MQTT
 */
import { RuntimeRuleAction } from "@uhn/blueprint";
import { isLogicalResource, RuntimeAnalogOutputResource, RuntimeDigitalOutputResource } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { assertNever } from "@uxp/common";
import { blueprintResourceService } from "../services/blueprint-resource.service";
import { commandEdgeService } from "../services/command-edge.service";
import { muteEdgeService } from "../services/mute-edge.service";
import { ruleRuntimeProcessService } from "../services/rule-runtime-process.service";
import { stateSignalService } from "../services/state-signal.service";
import { logicalResourceEdgeService } from "../services/logical-resource-edge.service";


let initialized = false;

function handleActionEvent(actions: RuntimeRuleAction[]) {
    // Handle the action event here
    AppLogger.info({
        message: `Action event received: ${JSON.stringify(actions)}`
    });
    actions.forEach(act => {
        switch (act.type) {
            case "setDigitalOutput":
                handleSetDigitalOutputAction(act);
                break;
            case "setAnalogOutput":
                handleSetAnalogOutputAction(act);
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

function handleSetDigitalOutputAction(action: Extract<RuntimeRuleAction, { type: "setDigitalOutput" }>) {
    const resource = blueprintResourceService.getResourceById(action.resourceId)
    if (resource?.type === "digitalOutput") {
        commandEdgeService.sendDigitalCommandToEdge(resource as RuntimeDigitalOutputResource, {
            type: "set",
            value: action.value ?? false,
        });
        return;
    }
    AppLogger.warn({
        message: `SetDigitalOutput action received for non-digitalOutput resource: ${action.resourceId}`
    });
}
function handleSetAnalogOutputAction(action: Extract<RuntimeRuleAction, { type: "setAnalogOutput" }>) {
    const resource = blueprintResourceService.getResourceById(action.resourceId);
    if (resource?.type === "analogOutput") {
        const analogResource = resource as RuntimeAnalogOutputResource;
        let value = action.value;
        if (analogResource.min != null && value < analogResource.min) {
            value = analogResource.min;
        }
        if (analogResource.max != null && value > analogResource.max) {
            value = analogResource.max;
        }
        commandEdgeService.sendAnalogCommandToEdge(analogResource, value);
        return;
    }
    AppLogger.warn({
        message: `SetAnalogOutput action received for non-analogOutput resource: ${action.resourceId}`
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
        if (isLogicalResource(resource) && resource.host === "master") {
            AppLogger.warn({ message: `TimerStart dispatched for master-hosted timer ${action.resourceId} — should have been executed locally` });
            return;
        }
        logicalResourceEdgeService.sendCommandToEdge(resource, {
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
        if (isLogicalResource(resource) && resource.host === "master") {
            AppLogger.warn({ message: `TimerClear dispatched for master-hosted timer ${action.resourceId} — should have been executed locally` });
            return;
        }
        logicalResourceEdgeService.sendCommandToEdge(resource, { action: "clear" });
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

