import type {
    AnyResource,
    DigitalInputResource,
    AnalogInputResource,
} from "./resource_old";
import type { RuleContext } from "./context";

export type ThresholdDirection = "rising" | "falling";

export type TriggerKind =
    | "press"
    | "change"
    | "threshold"
    | "scheduler";

export interface RuleTriggerBase {
    kind: TriggerKind;
}

export interface PressTrigger extends RuleTriggerBase {
    kind: "press";
    resource: DigitalInputResource;
}

export interface ChangeTrigger extends RuleTriggerBase {
    kind: "change";
    resource: AnyResource;
}

export interface ThresholdTrigger extends RuleTriggerBase {
    kind: "threshold";
    resource: AnalogInputResource;
    direction: ThresholdDirection;
    threshold: number;
}

export interface SchedulerTrigger extends RuleTriggerBase {
    kind: "scheduler";
    cron: string;
}

export type RuleTrigger =
    | PressTrigger
    | ChangeTrigger
    | ThresholdTrigger
    | SchedulerTrigger;

export type RuleHandler = (ctx: RuleContext) => unknown | Promise<unknown>;

export interface RuleDefinition {
    /** Blueprint-local rule id */
    id: string;
    /** Triggers that cause this rule to run */
    triggers: RuleTrigger[];
    /** User function implementing the rule logic */
    handler: RuleHandler;
}

/**
 * Builder interface that rule authors see.
 */
export interface RuleBuilder {
    onPress(resource: DigitalInputResource): RuleBuilder;
    onChange(resource: AnyResource): RuleBuilder;
    orOnThreshold(
        resource: AnalogInputResource,
        direction: ThresholdDirection,
        threshold: number,
    ): RuleBuilder;
    orOnScheduler(cron: string): RuleBuilder;
    run(handler: RuleHandler): RuleDefinition;
}

/**
 * DSL entrypoint: rule("id")
 *
 * This returns a fluent builder. Internally we just keep a small array of triggers.
 * UHN-master can statically analyze calls to `rule()` and the chain of methods.
 */
export function rule(id: string): RuleBuilder {
    const triggers: RuleTrigger[] = [];

    const builder: RuleBuilder = {
        onPress(resource) {
            triggers.push({
                kind: "press",
                resource,
            });
            return builder;
        },
        onChange(resource) {
            triggers.push({
                kind: "change",
                resource,
            });
            return builder;
        },
        orOnThreshold(resource, direction, threshold) {
            triggers.push({
                kind: "threshold",
                resource,
                direction,
                threshold,
            });
            return builder;
        },
        orOnScheduler(cron) {
            triggers.push({
                kind: "scheduler",
                cron,
            });
            return builder;
        },
        run(handler) {
            return {
                id,
                triggers: [...triggers],
                handler,
            };
        },
    };

    return builder;
}
