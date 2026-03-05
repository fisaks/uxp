import { RuleTimers, RuntimeRuleAction } from "@uhn/blueprint";
import { ResourceStateNotAvailableError } from "@uhn/common";
import { RuntimeStateService } from "../services/runtime-state.service";
import { RuntimeTimerService } from "../services/runtime-timer.service";
import { RuntimeMode } from "../types/rule-runtime.type";

export type ModeAwareRuleTimers = RuleTimers & {
    drainPendingActions: () => RuntimeRuleAction[];
};

export function createRuleTimer({ timerService, stateService, mode, edgeName }: {
    timerService: RuntimeTimerService;
    stateService: RuntimeStateService;
    mode: RuntimeMode;
    edgeName?: string;
}): ModeAwareRuleTimers {
    const pendingActions: RuntimeRuleAction[] = [];

    /** Timer runs locally in this runtime (edge owns it, or master owns it and we are master). */
    function isLocalTimer(host: string | undefined): boolean {
        if (mode === "edge") return host === edgeName;
        return host === "master";
    }

    // In edge mode, timerService tracks running timers locally for this edge's timers.
    // In master mode with master-hosted timers, timerService also tracks locally.
    // In master mode with edge-hosted timers, timer state arrives via MQTT → stateUpdate.
    // Timers not owned by this runtime are not available (edge→master, edge1→edge2).
    function isTimerActive(timerId: string | undefined, host: string | undefined): boolean {
        if (!timerId) return false;
        if (mode === "edge") {
            if (!isLocalTimer(host)) {
                throw new ResourceStateNotAvailableError(timerId, "timer", `Timer ${timerId} (host: ${host}) is not available on edge runtime ${edgeName}`);
            }
            return timerService.isRunning({ id: timerId, type: "timer", host: host ?? "" });
        }
        // Master mode: local timers use timerService, edge-hosted use stateService
        if (isLocalTimer(host)) {
            // master owned timers
            return timerService.isRunning({ id: timerId, type: "timer", host: "master" });
        }
        // edge owned timers - check state service for active state
        return stateService.get(timerId)?.value === true;
    }

    return {
        start(timer, durationMs, timerMode) {
            const running = isTimerActive(timer.id, timer.host);
            if (timerMode === "startOnce" && running) {
                return "alreadyRunning";
            }

            if (isLocalTimer(timer.host)) {
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
            const res = isTimerActive(timer.id, timer.host) ? "cleared" : "notRunning";
            if (isLocalTimer(timer.host)) {
                timerService.clear(timer);
            } else {
                pendingActions.push({ type: "timerClear", resourceId: timer.id! });
            }
            return res;
        },
        isRunning(timer) {
            return isTimerActive(timer.id, timer.host);
        },
        drainPendingActions() {
            return pendingActions.splice(0);
        }
    };
}
