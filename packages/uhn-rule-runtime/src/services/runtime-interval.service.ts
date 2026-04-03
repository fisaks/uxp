import type { IntervalCallbackContext, IntervalController, IntervalOptions, RuleAction, RuleLogger, RuntimeRuleAction, StateReader } from "@uhn/blueprint";
import { ResourceStateNotAvailableError } from "@uhn/common";
import { runtimeOutput } from "../io/runtime-output";
import type { RuntimeStateService } from "./runtime-state.service";
import { createRuleStateReader } from "../rule/rule-state-reader";
import { ruleLogger } from "../rule/rule-engine-logging";
import { expandSceneActions, filterReachableActions, toRuntimeAction } from "../rule/rule-action.utils";
import { RuntimeMode } from "../types/rule-runtime.type";

const MIN_INTERVAL_MS = 50;
const DEFAULT_MAX_ITERATIONS = 500;

type InternalInterval = {
    timeout: NodeJS.Timeout;
    callback: (ctx: IntervalCallbackContext) => RuleAction[];
    logger: RuleLogger;
    intervalMs: number;
    iteration: number;
    maxIterations: number;
    stopped: boolean;
    nextParams: Record<string, unknown> | undefined;
};

/**
 * Managed repeating callback service for rules.
 *
 * Allows rules to perform repeating actions while a condition holds
 * (e.g. ramping a dimmer while a button is held). Each tick executes
 * a callback that can read state, return actions, adjust the interval,
 * pass params to the next tick, or self-stop.
 *
 * Uses chained `setTimeout` (not `setInterval`) so each tick honors
 * `setNextInterval()` and cannot overlap with the previous tick.
 * Actions are dispatched asynchronously via IPC on each tick — there
 * is no `drainPendingActions` phase, so the service is stateless between
 * rule executions and implements `IntervalController` directly (no
 * per-execution wrapper needed, unlike timer/mute).
 */
export class RuntimeIntervalService implements IntervalController {
    private readonly intervals = new Map<string, InternalInterval>();
    private readonly stateReader: StateReader;

    constructor(
        stateService: RuntimeStateService,
        private readonly mode: RuntimeMode,
        private readonly edgeName?: string,
    ) {
        this.stateReader = createRuleStateReader({ stateService });
    }

    start(
        id: string,
        options: IntervalOptions,
        callback: (ctx: IntervalCallbackContext) => RuleAction[],
    ): void {
        // Same ID replaces
        if (this.intervals.has(id)) {
            this.stop(id);
        }

        const intervalMs = Math.max(MIN_INTERVAL_MS, options.intervalMs);
        const maxIterations = options.maxIterations ?? DEFAULT_MAX_ITERATIONS;
        const logger = ruleLogger(`interval:${id}`);

        const firstDelay = options.fireImmediately ? 0 : intervalMs;
        this.intervals.set(id, {
            timeout: setTimeout(() => this.tick(id), firstDelay),
            callback,
            logger,
            intervalMs,
            iteration: 0,
            maxIterations,
            stopped: false,
            nextParams: options.initialParams,
        });

        runtimeOutput.log({
            level: "debug",
            component: "IntervalService",
            message: `Started interval "${id}" (every ${intervalMs}ms, max ${maxIterations} iterations)`,
        });
    }

    stop(id: string): void {
        const entry = this.intervals.get(id);
        if (!entry) return;
        entry.stopped = true;
        clearTimeout(entry.timeout);
        this.intervals.delete(id);

        runtimeOutput.log({
            level: "debug",
            component: "IntervalService",
            message: `Stopped interval "${id}" after ${entry.iteration} iterations`,
        });
    }

    isRunning(id: string): boolean {
        return this.intervals.has(id);
    }

    private tick(id: string): void {
        const entry = this.intervals.get(id);
        if (!entry || entry.stopped) return;

        // Max iterations safety net
        if (entry.iteration >= entry.maxIterations) {
            runtimeOutput.log({
                level: "warn",
                component: "IntervalService",
                message: `Interval "${id}" hit max iterations (${entry.maxIterations}) — stopping`,
            });
            this.stop(id);
            return;
        }

        let nextIntervalMs = entry.intervalMs;
        let stopped = false;
        let nextParams = entry.nextParams;

        const callbackCtx: IntervalCallbackContext = {
            runtime: this.stateReader,
            logger: entry.logger,
            stop: () => { stopped = true; },
            setNextInterval: (ms: number) => { nextIntervalMs = Math.max(MIN_INTERVAL_MS, ms); },
            setNextParams: (params: Record<string, unknown>) => { nextParams = params; },
            params: entry.nextParams,
            iteration: entry.iteration,
        };

        let actions: RuleAction[];
        try {
            actions = entry.callback(callbackCtx);
        } catch (error) {
            if (error instanceof ResourceStateNotAvailableError) {
                runtimeOutput.log({
                    level: "info",
                    component: "IntervalService",
                    message: `Interval "${id}" tick ${entry.iteration}: resource state not available — skipping tick`,
                });
                // Schedule next tick, don't stop
                entry.iteration++;
                entry.nextParams = nextParams;
                entry.intervalMs = nextIntervalMs;
                if (!stopped) {
                    entry.timeout = setTimeout(() => this.tick(id), nextIntervalMs);
                } else {
                    this.stop(id);
                }
                return;
            }
            // Other errors stop the interval
            runtimeOutput.log({
                level: "error",
                component: "IntervalService",
                message: `Interval "${id}" tick ${entry.iteration} threw — stopping: ${String(error)}`,
            });
            this.stop(id);
            return;
        }

        // Check if callback called stop()
        if (stopped) {
            this.stop(id);
            // Still dispatch any actions from the final tick
            this.dispatchActions(id, actions);
            return;
        }

        // Dispatch actions
        this.dispatchActions(id, actions);

        // Schedule next tick
        entry.iteration++;
        entry.nextParams = nextParams;
        entry.intervalMs = nextIntervalMs;
        entry.timeout = setTimeout(() => this.tick(id), nextIntervalMs);
    }

    private dispatchActions(intervalId: string, actions: RuleAction[]): void {
        if (!actions.length) return;

        const reachableActions = filterReachableActions(
            expandSceneActions(actions),
            this.mode,
            this.edgeName,
            "IntervalService",
        );

        const runtimeActions = reachableActions
            .map(a => toRuntimeAction(a, "IntervalService", 1))
            .filter((a): a is RuntimeRuleAction => a !== undefined);

        if (runtimeActions.length) {
            runtimeOutput.send({
                kind: "event",
                cmd: "actions",
                actions: runtimeActions,
            });
        }
    }
}
