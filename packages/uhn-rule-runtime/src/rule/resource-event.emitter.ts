// services/resource-event-emitter.ts
import { TriggerEvent } from "@uhn/blueprint";
import { assertNever } from "@uxp/common";
import { runtimeOutput } from "../io/runtime-output";
import { RuntimeResourceService } from "../services/runtime-resource.service";
import type { RuntimeStateService } from "../services/runtime-state.service";
import type { RuntimeStateChange } from "../types/rule-runtime.type";
import { getEventsFromStateChange, getTimerEventsFromStateChange } from "./rule-engine.utils";
import type { TriggerEventBus } from "./trigger-event-bus";


export class ResourceEventEmitter {
    constructor(
        stateService: RuntimeStateService,
        private readonly triggerEventBus: TriggerEventBus,
        private readonly resourceService: RuntimeResourceService
    ) {
        stateService.on("stateChanged", (change) => {
            setImmediate(() => this.handleStateChange(change));
        });
    }

    private handleStateChange(
        change: RuntimeStateChange
    ) {
        const { resourceId, prev, next } = change;
        const resource = this.resourceService.getById(resourceId);
        if (!resource) {
            runtimeOutput.log({ level: "warn", component: "ResourceEventEmitter", message: `Resource with ID "${resourceId}" not found` });
            return;
        }
        const events: TriggerEvent[] = [];
        switch (resource.type) {
            case "digitalInput":
            case "digitalOutput":
                events.push(...getEventsFromStateChange(prev, next));
                break;
            case "timer":
                events.push(...getTimerEventsFromStateChange(prev, next));
                break;
            default:
                assertNever(resource.type);
        }

        if (!events.length) return;

        for (const event of events) {
            this.triggerEventBus.emit({
                resource,
                event,
                timestamp: next.timestamp,
            });
        }
    }
}
