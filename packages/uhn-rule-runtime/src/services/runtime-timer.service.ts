import { TimerResourceBase } from "@uhn/blueprint";
import { ResourceMissingIdError } from "@uhn/common";
import { EventEmitter } from "stream";
import { TimerAPI, TimerRuntimeState } from "../types/timer-runtime.type";
import { RuntimeStateService } from "./runtime-state.service";

type InternalTimer = {
    timeout: NodeJS.Timeout;
    state: TimerRuntimeState;
};

export type TimerRuntimeEventMap = {
    timerStateChanged: [state: TimerRuntimeState];
};

export class RuntimeTimerService extends EventEmitter<TimerRuntimeEventMap> implements TimerAPI {

    private readonly timers = new Map<string, InternalTimer>();

    constructor(private readonly stateService: RuntimeStateService) {
        super();
    }

    start(timer: TimerResourceBase, delayMs: number) {
        if (!timer.id) throw new ResourceMissingIdError("timer", "Timer resource is missing id");

        const existingTimer = this.timers.get(timer.id);
        // If there is an existing timer, clear it first. Do not emit deactivated event because we are extending the duration.
        this.clearTimeout(timer.id, existingTimer);

        const now = Date.now();
        const stopAt = now + delayMs;

        const timerState: TimerRuntimeState = {
            id: timer.id,
            active: true,
            startedAt: existingTimer ? existingTimer.state.startedAt : now,
            stopAt,
        };

        this.stateService.update(timer.id, true, now);

        this.emit("timerStateChanged", timerState);

        const timeout = setTimeout(() => {

            // timer naturally ended
            this.timers.delete(timerState.id);

            const endedAt = Date.now();
            const endedState: TimerRuntimeState = {
                id: timerState.id,
                active: false,
                startedAt: timerState.startedAt,
                stopAt: timerState.stopAt,
            };

            this.stateService.update(timerState.id, false, endedAt);
            this.emit("timerStateChanged", endedState);
        }, Math.max(0, delayMs));

        this.timers.set(timer.id, { timeout, state: timerState });
    }

    clear(timer: TimerResourceBase) {
        if (!timer.id) throw new ResourceMissingIdError("timer", "Timer resource is missing id");

        const existingTimer = this.timers.get(timer.id);
        if (!existingTimer) return;

        this.clearTimeout(timer.id, existingTimer);

        const now = Date.now();
        const clearedState: TimerRuntimeState = {
            id: timer.id,
            active: false,
            startedAt: existingTimer.state.startedAt,
            stopAt: existingTimer.state.stopAt,
        };

        this.stateService.update(timer.id, false, now);
        this.emit("timerStateChanged", clearedState);
    }

    private clearTimeout(timerId: string, timer: InternalTimer | undefined) {
        if (timer !== undefined) {
            clearTimeout(timer.timeout);
            this.timers.delete(timerId);
        }
    }

    isRunning(timer: TimerResourceBase) {
        if (!timer.id) return false;
        return this.timers.has(timer.id);
    }

    getState(timer: TimerResourceBase) {
        if (!timer.id) return undefined;
        return this.timers.get(timer.id)?.state;
    }


}
