// packages/uhn-blueprint/src/index.ts

// Core types & factories
export type {
    EdgeId,
    DeviceId,
    PinIndex,
    ResourceKind,
    BaseResource,
    AnyResource,
    ResourceOfKind,
    DigitalInputResource,
    DigitalOutputResource,
    AnalogInputResource,
    AnalogOutputResource,
    TimerResource,
    SchedulerResource,
    EnvDataResource,
    InternalFlagResource,
    ResourceGroupResource,
} from "./resource";

export {
    digitalInput,
    digitalOutput,
    analogInput,
    analogOutput,
    timer,
    scheduler,
    envData,
    internalFlag,
    resourceGroup,
} from "./resource";

// Rule DSL
export type {
    RuleDefinition,
    RuleHandler,
    RuleTrigger,
    RuleBuilder,
    RuleTriggerBase,
    PressTrigger,
    ChangeTrigger,
    ThresholdTrigger,
    SchedulerTrigger,
    ThresholdDirection,
} from "./rule";

export { rule } from "./rule";

// Context
export type {
    RuleContext,
    StateFn,
    SetFn,
    SetCommand,
    StateSnapshot,
    FlagState,
    EnvState,
} from "./context";

// Metadata
export type { BlueprintMetadata } from "./metadata";
