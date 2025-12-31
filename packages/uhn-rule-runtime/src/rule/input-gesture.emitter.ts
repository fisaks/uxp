// services/input-gesture-emitter.ts
import type {
    DigitalInputResourceBase,
    RuleTrigger
} from "@uhn/blueprint";
import { runtimeOutput } from "../io/runtime-output";
import { RuntimeResourceService } from "../services/runtime-resource.service";
import type { RuntimeRulesService } from "../services/runtime-rules.service";
import type { RuntimeStateService } from "../services/runtime-state.service";
import type { RuntimeStateChange } from "../types/rule-runtime.type";
import { PushPressState } from "./rule-engine.type";
import { isLongPressTrigger, isPushButton } from "./rule-engine.utils";
import type { TriggerEventBus } from "./trigger-event-bus";

export class InputGestureEmitter {
    private readonly pressState = new Map<string, PushPressState>();

    constructor(
        stateService: RuntimeStateService,
        private readonly rulesService: RuntimeRulesService,
        private readonly triggerEventBus: TriggerEventBus,
        private readonly resourceService: RuntimeResourceService
    ) {
        stateService.on("stateChanged", (change) => {
            setImmediate(() => this.handleStateChange(change));
        });

        stateService.on("stateReset", () => {
            this.reset();
        });
    }

    private handleStateChange(change: RuntimeStateChange) {
        const { resourceId, prev, next } = change;
        const resource = this.resourceService.getById(resourceId);
        if (!resource) {
            runtimeOutput.log({ level: "warn", component: "InputGestureEmitter", message: `Resource with ID "${resourceId}" not found` });
            return;
        }

        if (!isPushButton(resource)) {
            return;
        }

        // press
        if (prev?.value === false && next.value === true) {
            this.onPress(resource, next.timestamp);
            return;
        }

        // release
        if (prev?.value === true && next.value === false) {
            this.onRelease(resource, next.timestamp);
        }
    }



    private onPress(
        resource: DigitalInputResourceBase,
        timestamp: number
    ) {
        const resourceId = resource.id!;
        this.clearState(resourceId);

        const thresholds = this.getLongPressThresholds(resourceId);

        const state: PushPressState = {
            pressedAt: timestamp,
            firedThresholds: new Set(),
            timers: new Map(),
        };

        for (const thresholdMs of thresholds) {
            const timer = setTimeout(() => {
                this.fireLongPress(resource, thresholdMs);
            }, thresholdMs);

            state.timers.set(thresholdMs, timer);
        }

        this.pressState.set(resourceId, state);
    }

    private onRelease(
        resource: DigitalInputResourceBase,
        timestamp: number
    ) {
        const resourceId = resource.id!;
        const state = this.pressState.get(resourceId);
        if (!state) return;

        const shouldEmitTap = state.firedThresholds.size === 0;

        this.clearState(resourceId);

        if (shouldEmitTap) {
            this.triggerEventBus.emit({
                resource,
                event: "tap",
                timestamp,
            });
        }
    }

    private fireLongPress(
        resource: DigitalInputResourceBase,
        thresholdMs: number
    ) {
        const resourceId = resource.id!;
        const state = this.pressState.get(resourceId);
        if (!state) return;

        if (state.firedThresholds.has(thresholdMs)) return;
        state.firedThresholds.add(thresholdMs);

        this.triggerEventBus.emit({
            resource,
            event: "longPress",
            timestamp: state.pressedAt + thresholdMs,
            thresholdMs,
        });
    }

    private clearState(resourceId: string) {
        const state = this.pressState.get(resourceId);
        if (!state) return;

        for (const timer of state.timers.values()) {
            clearTimeout(timer);
        }

        this.pressState.delete(resourceId);
    }

    private reset() {
        for (const id of this.pressState.keys()) {
            this.clearState(id);
        }
    }

    private getLongPressThresholds(resourceId: string): number[] {
        const rulesForResource = this.rulesService.getRulesForResource(resourceId);

        const thresholds = new Set<number>();
        for (const ruleCandidate of rulesForResource) {
            for (const triggerCandidate of ruleCandidate.triggers) {
                if (isLongPressTrigger(triggerCandidate) &&
                    triggerCandidate.resource.id === resourceId
                ) {
                    thresholds.add(triggerCandidate.thresholdMs);
                }
            }
        }

        return [...thresholds].sort((a, b) => a - b);
    }

}
