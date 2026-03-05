import type { TimerResourceBase } from "@uhn/blueprint";

export type TimerRuntimeState = {
    id: string; // timer.id
    active: boolean;
    startedAt: number; // epoch ms
    stopAt: number; // epoch ms
};

export type TimerAPI = {
    start(timer: TimerResourceBase, delayMs: number): void;
    clear(timer: TimerResourceBase): void;
    isRunning(timer: TimerResourceBase): boolean;
    getState(timer: TimerResourceBase): TimerRuntimeState | undefined;
};
