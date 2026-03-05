import { ResourceState } from "@uhn/blueprint";
import type { RuntimeMuteService } from "../services/runtime-mute.service";
import { RuntimeResourceService } from "../services/runtime-resource.service";
import { RuntimeRulesService } from "../services/runtime-rules.service";
import { RuntimeStateService } from "../services/runtime-state.service";
import { RuntimeTimerService } from "../services/runtime-timer.service";
import type { TriggerEventBus } from "../rule/trigger-event-bus";

export const RuntimeModes = ["master", "edge"] as const;
export type RuntimeMode = typeof RuntimeModes[number];

export type RuleRuntimeDependencies = {
    runMode: RuntimeMode;
    edgeName?: string;
    resourceService: RuntimeResourceService;
    stateService: RuntimeStateService;
    rulesService: RuntimeRulesService;
    timerService: RuntimeTimerService;
    muteService: RuntimeMuteService;
    triggerEventBus: TriggerEventBus;
};

export type RuntimeStateChange = {
    resourceId: string;
    prev?: ResourceState;
    next: ResourceState;
};
