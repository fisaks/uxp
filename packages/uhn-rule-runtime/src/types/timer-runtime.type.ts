import type { TimerResourceBase } from "@uhn/blueprint"; // adjust import

export type TimerRuntimeState = {
    id: string; // timer.id
    active: boolean;
    startedAt: number; // epoch ms
    stopAt: number; // epoch ms
};

export type TimerRuntimeEvent =
    | { type: "timerStateChanged"; state: TimerRuntimeState }
    | { type: "timerRemoved"; timerId: string };

export type TimerRuntimeListener = (ev: TimerRuntimeEvent) => void;

export type TimerAPI = {
    start(timer: TimerResourceBase, delayMs: number): void;
    clear(timer: TimerResourceBase): void;
    isRunning(timer: TimerResourceBase): boolean;
    getState(timer: TimerResourceBase): TimerRuntimeState | undefined;
};
