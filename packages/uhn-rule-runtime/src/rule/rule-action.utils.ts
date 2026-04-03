import type { RuleAction, RuntimeRuleAction } from "@uhn/blueprint";
import { assertNever } from "@uxp/common";
import { runtimeOutput } from "../io/runtime-output";
import { RuntimeMode } from "../types/rule-runtime.type";

export type ExpandedAction = Exclude<RuleAction, { type: "activateScene" }>;

/** Expand activateScene actions into individual scene commands. */
export function expandSceneActions(actions: RuleAction[]): ExpandedAction[] {
    return actions.flatMap(action =>
        action.type === "activateScene" ? action.scene.commands : [action]
    ) as ExpandedAction[];
}

/** Extract the execution target (edge or host) from an action's resource. */
export function getActionResourceTarget(action: ExpandedAction): string | undefined {
    switch (action.type) {
        case "setDigitalOutput":
            return action.resource.edge;
        case "setAnalogOutput":
            return "edge" in action.resource ? action.resource.edge : action.resource.host;
        case "emitSignal":
            return "edge" in action.resource ? action.resource.edge : action.resource.host;
        case "emitAction":
            return action.resource.edge;
        case "setActionOutput":
            return action.resource.edge;
        case "setVirtualState":
            return "host" in action.resource ? action.resource.host : undefined;
    }
}

/**
 * Filter out actions targeting resources unreachable from this runtime.
 * Edge runtimes can only dispatch to resources on the same edge;
 * master can reach all targets so no filtering is needed.
 */
export function filterReachableActions(
    actions: ExpandedAction[],
    mode: RuntimeMode,
    edgeName: string | undefined,
    component: string,
): ExpandedAction[] {
    if (mode === "master") return actions;

    return actions.filter(action => {
        const target = getActionResourceTarget(action);
        if (target && target !== edgeName) {
            runtimeOutput.log({
                level: "error",
                component,
                message: `Action targets resource "${action.resource.id}" on "${target}" but this runtime runs on edge "${edgeName}" — skipping`,
            });
            return false;
        }
        return true;
    });
}

/**
 * Convert a RuleAction to its IPC-serializable RuntimeRuleAction form.
 * Does not handle cause-based loop prevention — callers add that on top.
 */
export function toRuntimeAction(action: ExpandedAction, component: string, emitActionDepth: number): RuntimeRuleAction | undefined {
    if (!action.resource.id) {
        runtimeOutput.log({ level: "error", component, message: `Action resource is missing id: ${JSON.stringify(action)}` });
        return undefined;
    }

    switch (action.type) {
        case "setDigitalOutput":
            return { type: "setDigitalOutput", resourceId: action.resource.id, value: action.value };
        case "setAnalogOutput":
            return { type: "setAnalogOutput", resourceId: action.resource.id, value: action.value };
        case "emitSignal":
            return { type: "emitSignal", resourceId: action.resource.id, value: action.value };
        case "emitAction":
            return {
                type: "emitAction",
                resourceId: action.resource.id,
                action: action.action,
                metadata: action.metadata,
                depth: emitActionDepth,
            };
        case "setActionOutput":
            return { type: "setActionOutput", resourceId: action.resource.id, action: action.action };
        case "setVirtualState":
            return { type: "setVirtualState", resourceId: action.resource.id, value: action.value };
        default:
            assertNever(action, "Unsupported RuleAction type in toRuntimeAction");
    }
}
