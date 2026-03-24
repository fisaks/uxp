// services/resource-event-emitter.ts
import { TriggerEvent } from "@uhn/blueprint";
import { assertNever } from "@uxp/common";
import { runtimeOutput } from "../io/runtime-output";
import { RuntimeResourceService } from "../services/runtime-resource.service";
import type { RuntimeStateService } from "../services/runtime-state.service";
import type { RuntimeStateChange } from "../types/rule-runtime.type";
import { getAnalogInputEventsFromStateChange, getAnalogOutputEventsFromStateChange, getComplexEventsFromStateChange, getEventsFromStateChange, getTimerEventsFromStateChange } from "./rule-engine.utils";
import type { TriggerEventBus } from "./trigger-event-bus";


/**
 * Converts state changes into rule trigger events.
 * Listens to stateService "stateChanged" events and emits typed trigger events
 * (activated, deactivated, changed, timerActivated, etc.) to the TriggerEventBus.
 *
 * Only handles state-based resources. actionInput events bypass this entirely —
 * they arrive via IPC (actionEvent command) and are emitted directly to the
 * TriggerEventBus by handleActionEvent.
 */
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
            case "virtualDigitalInput":
                events.push(...getEventsFromStateChange(prev, next));
                break;
            case "analogInput":
                events.push(...getAnalogInputEventsFromStateChange(prev, next));
                break;
            case "analogOutput":
            case "virtualAnalogOutput":
                events.push(...getAnalogOutputEventsFromStateChange(prev, next));
                break;
            case "timer":
                events.push(...getTimerEventsFromStateChange(prev, next));
                break;
            case "complex":
                events.push(...getComplexEventsFromStateChange(prev, next));
                break;
            case "actionInput":
            case "actionOutput":
                // Action events arrive via IPC (actionEvent/setActionOutput), not state changes
                break;
            default:
                assertNever(resource);
        }

        if (!events.length) return;

        for (const event of events) {
            this.triggerEventBus.emit({
                resource,
                event,
                timestamp: next.timestamp,
                prevValue: prev?.value,
                value: next.value,
            });
        }
    }
}
