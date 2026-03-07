import { RuleRuntimeLongPressCommand } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";

export function handleLongPressCommand({ resourceService, triggerEventBus }: RuleRuntimeDependencies, cmd: RuleRuntimeLongPressCommand) {
    const { resourceId, timestamp, thresholdMs } = cmd.payload;

    const resource = resourceService.getById(resourceId);
    if (!resource || resource.type !== "digitalInput") {
        runtimeOutput.log({
            component: "handleLongPressCommand",
            level: "error",
            message: `Resource ${resourceId} not found or not a digitalInput resource`,
        });
        return;
    }

    triggerEventBus.emit({
        resource,
        event: "longPress",
        timestamp,
        thresholdMs,
    });

    runtimeOutput.log({
        component: "handleLongPressCommand",
        level: "info",
        message: `LongPress event emitted for digitalInput resource ${resourceId} (thresholdMs: ${thresholdMs})`,
    });
}
