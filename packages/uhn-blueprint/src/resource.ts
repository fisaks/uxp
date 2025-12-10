
export type EdgeId = string;
export type DeviceId = number;
export type PinIndex = number;

export type ResourceKind =
    | "digitalInput"
    | "digitalOutput"
    | "analogInput"
    | "analogOutput"
    | "timer"
    | "scheduler"
    | "envData"
    | "internalFlag"
    | "resourceGroup";

export interface BaseResource {
    /** Unique id inside the blueprint */
    id: string;
    /** Edge node id */
    edge?: EdgeId;
    /** Device index/address on that edge */
    device?: DeviceId;
    /** Pin or channel index */
    pin?: PinIndex;
    /** Optional human text */
    description?: string;
    /** Discriminant for resource type */
    kind: ResourceKind;
}

/**
 * Specialized resource types.
 * We can tighten these later (e.g. make edge/device required for IO resources).
 */
export interface DigitalInputResource extends BaseResource {
    kind: "digitalInput";
}

export interface DigitalOutputResource extends BaseResource {
    kind: "digitalOutput";
}

export interface AnalogInputResource extends BaseResource {
    kind: "analogInput";
}

export interface AnalogOutputResource extends BaseResource {
    kind: "analogOutput";
}

export interface TimerResource extends BaseResource {
    kind: "timer";
}

export interface SchedulerResource extends BaseResource {
    kind: "scheduler";
    /** Cron-like or "HH:MM" pattern  */
    cron?: string;
}

export interface EnvDataResource extends BaseResource {
    kind: "envData";
}

export interface InternalFlagResource extends BaseResource {
    kind: "internalFlag";
}

export interface ResourceGroupResource extends BaseResource {
    kind: "resourceGroup";
}

export type AnyResource =
    | DigitalInputResource
    | DigitalOutputResource
    | AnalogInputResource
    | AnalogOutputResource
    | TimerResource
    | SchedulerResource
    | EnvDataResource
    | InternalFlagResource
    | ResourceGroupResource;

export type ResourceOfKind<K extends ResourceKind> = Extract<AnyResource, { kind: K }>;

/**
 * Internal helper for factories – keeps everything consistent and easy to statically analyze.
 */
function makeResource<K extends ResourceKind>(
    kind: K,
    args: Omit<ResourceOfKind<K>, "kind">,
): ResourceOfKind<K> {
    return { ...args, kind } as ResourceOfKind<K>;
}

/**
 * Factory helpers for user blueprints
 * These are what rule authors will actually import and use.
 */

export function digitalInput(
    args: Omit<DigitalInputResource, "kind">,
): DigitalInputResource {
    return makeResource("digitalInput", args);
}

export function digitalOutput(
    args: Omit<DigitalOutputResource, "kind">,
): DigitalOutputResource {
    return makeResource("digitalOutput", args);
}

export function analogInput(
    args: Omit<AnalogInputResource, "kind">,
): AnalogInputResource {
    return makeResource("analogInput", args);
}

export function analogOutput(
    args: Omit<AnalogOutputResource, "kind">,
): AnalogOutputResource {
    return makeResource("analogOutput", args);
}

export function timer(
    args: Omit<TimerResource, "kind">,
): TimerResource {
    return makeResource("timer", args);
}

export function scheduler(
    args: Omit<SchedulerResource, "kind">,
): SchedulerResource {
    return makeResource("scheduler", args);
}

export function envData(
    args: Omit<EnvDataResource, "kind">,
): EnvDataResource {
    return makeResource("envData", args);
}

export function internalFlag(
    args: Omit<InternalFlagResource, "kind">,
): InternalFlagResource {
    return makeResource("internalFlag", args);
}

export function resourceGroup(
    args: Omit<ResourceGroupResource, "kind">,
): ResourceGroupResource {
    return makeResource("resourceGroup", args);
}
