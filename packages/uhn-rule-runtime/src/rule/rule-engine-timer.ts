import { RuleTimers, RuntimeRuleAction } from "@uhn/blueprint";
import { RuntimeStateService } from "../services/runtime-state.service";
import { RuntimeTimerService } from "../services/runtime-timer.service";
import { RuntimeMode } from "../types/rule-runtime.type";

export type ModeAwareRuleTimers = RuleTimers & {
    drainPendingActions: () => RuntimeRuleAction[];
};

export function createRuleTimer({ timerService, stateService, mode }: {
    timerService: RuntimeTimerService;
    stateService: RuntimeStateService;
    mode: RuntimeMode;
}): ModeAwareRuleTimers {
    const pendingActions: RuntimeRuleAction[] = [];

    // In edge mode, timerService tracks running timers locally.
    // In master mode, timer state arrives via MQTT → stateUpdate,
    // so we check the computed state to know if a timer is active.
    function isTimerActive(timerId: string | undefined): boolean {
        if (!timerId) return false;
        if (mode === "edge") {
            return timerService.isRunning({ id: timerId, type: "timer", edge: "" });
        }
        return stateService.get(timerId)?.value === true;
    }

    return {
        start(timer, durationMs, timerMode) {
            const running = isTimerActive(timer.id);
            if (timerMode === "startOnce" && running) {
                return "alreadyRunning";
            }

            if (mode === "edge") {
                timerService.start(timer, durationMs);
            } else {
                pendingActions.push({
                    type: "timerStart",
                    resourceId: timer.id!,
                    durationMs,
                    mode: timerMode,
                });
            }
            return running ? "restarted" : "started";
        },
        clear(timer) {
            const res = isTimerActive(timer.id) ? "cleared" : "notRunning";
            if (mode === "edge") {
                timerService.clear(timer);
            } else {
                pendingActions.push({ type: "timerClear", resourceId: timer.id! });
            }
            return res;
        },
        isRunning(timer) {
            return isTimerActive(timer.id);
        },
        drainPendingActions() {
            return pendingActions.splice(0);
        }
    };
}
