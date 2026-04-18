import type { InteractionView } from "./view";
import type { BlueprintRule } from "./rule";
import type { BlueprintScene } from "./scene";
import type { ScheduleBuilder } from "./schedule";
import type { ResourceBase, ResourceType } from "./resource";

export type DevFilter = {
    name: string;
    views?: InteractionView[];
    rules?: BlueprintRule[];
    scenes?: BlueprintScene[];
    schedules?: ScheduleBuilder<any>[];
    extraResources?: ResourceBase<ResourceType>[];
};
