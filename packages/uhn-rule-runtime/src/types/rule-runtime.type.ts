import { ResourceState } from "@uhn/blueprint";
import { RuntimeResourceService } from "../services/runtime-resource.service";
import { RuntimeRulesService } from "../services/runtime-rules.service";
import { RuntimeStateService } from "../services/runtime-state.service";

export const RuntimeModes = ["master", "edge"] as const;
export type RuntimeMode = typeof RuntimeModes[number];

export type RuleRuntimeDependencies = {
    runMode: RuntimeMode;
    resourceService: RuntimeResourceService;
    stateService: RuntimeStateService;
    rulesService: RuntimeRulesService;
};

export type RuntimeStateChange = {
    resourceId: string;
    prev?: ResourceState;
    next: ResourceState;
};
