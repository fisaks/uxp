import { isLogicalResource, RuleRuntimeTapCommand } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";
import { RuleRuntimeDependencies } from "../types/rule-runtime.type";

export function handleTapCommand({ resourceService, triggerEventBus }: RuleRuntimeDependencies, cmd: RuleRuntimeTapCommand) {
    const { resourceId, timestamp } = cmd.payload;

    const resource = resourceService.getById(resourceId);
    if (!resource || !isLogicalResource(resource) || (resource.type !== "complex" && resource.type !== "virtualDigitalInput")) {
        runtimeOutput.log({
            component: "handleTapCommand",
            level: "error",
            message: `Resource ${resourceId} not found or not a tappable logical resource`,
        });
        return;
    }

    triggerEventBus.emit({
        resource,
        event: "tap",
        timestamp,
    });

    runtimeOutput.log({
        component: "handleTapCommand",
        level: "info",
        message: `Tap event emitted for ${resource.type} resource ${resourceId}`,
    });
}
