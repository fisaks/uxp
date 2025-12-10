import type { AnyResource } from "./resource";

export interface StateSnapshot<TValue = unknown> {
    /** for digital inputs/outputs */
    active?: boolean;
    /** for analogs */
    value?: TValue;
    /** extra state fields depending on resource kind */
    [key: string]: unknown;
}

export type StateFn = <R extends AnyResource>(
    resource: R,
) => StateSnapshot;

export interface SetCommand {
    to(value: unknown): void;
}

export type SetFn = <R extends AnyResource>(resource: R) => SetCommand;

/**
 * Flags are global, per-blueprint internal state.
 * We keep them loose here; you can narrow this in your own projects.
 */
export type FlagState = Record<string, unknown>;

/**
 * Env data: external conditions like isDark, outsideTemperature, etc.
 * Again, left open for now; you can tighten via generics later.
 */
export type EnvState = Record<string, unknown>;

export interface RuleContext {
    state: StateFn;
    set: SetFn;
    flag: FlagState;
    env: EnvState;
}
