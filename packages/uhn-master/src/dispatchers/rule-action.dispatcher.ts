import { RuntimeRuleAction } from "@uhn/blueprint";
import { RuntimeDigitalOutputResource } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { assertNever } from "@uxp/common";
import { blueprintResourceService } from "../services/blueprint-resource.service";
import { commandEdgeService } from "../services/command-edge.service";
import { ruleRuntimeProcessService } from "../services/rule-runtime-process.service";
import { stateSignalService } from "../services/state-signal.service";


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
            default:
                assertNever(act);
        }
    });

}

function handleSetOutputAction(action: RuntimeRuleAction) {
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
function handleEmitSignalAction(action: RuntimeRuleAction) {
    const resource = blueprintResourceService.getResourceById(action.resourceId)
    if (resource?.type === "digitalInput") {
        stateSignalService.setSignalState(resource, action.value ?? false);
        return
    }
    AppLogger.warn({
        message: `EmitSignal action received for non-input resource: ${action.resourceId}`
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

