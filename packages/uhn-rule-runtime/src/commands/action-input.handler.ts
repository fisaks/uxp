import { RuleRuntimeActionEventCommand } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";

const ACTION_INPUT_TYPE = "actionInput";

export function handleActionEvent({ resourceService, triggerEventBus }: RuleRuntimeDependencies, cmd: RuleRuntimeActionEventCommand) {
    const { resourceId, action, metadata, timestamp } = cmd.payload;

    if (!action) return; // skip empty action strings

    const resource = resourceService.getById(resourceId);
    if (!resource || resource.type !== ACTION_INPUT_TYPE) {
        runtimeOutput.log({
            component: "handleActionEvent",
            level: "error",
            message: `Resource ${resourceId} ${resource ? `has type "${resource.type}" — expected actionInput` : "not found"}`,
        });
        return;
    }

    triggerEventBus.emit({
        resource,
        event: "action",
        timestamp,
        action,
        metadata,
    });

    runtimeOutput.log({
        component: "handleActionEvent",
        level: "info",
        message: `Action event "${action}" emitted for actionInput resource ${resourceId}`,
        data: metadata,
    });
}
