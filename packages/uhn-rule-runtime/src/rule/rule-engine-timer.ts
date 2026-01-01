import { RuleTimers } from "@uhn/blueprint";
import { RuntimeTimerService } from "../services/runtime-timer.service";

export function createRuleTimer({ timerService }: { timerService: RuntimeTimerService }): RuleTimers {
    return {
        start(timer, durationMs, mode) {
            const running = timerService.isRunning(timer);
            if (mode === "startOnce" && running) {
                return "alreadyRunning";
            }

            timerService.start(timer, durationMs);
            return running ? "restarted" : "started";
        },
        clear(timer) {
            const res = timerService.isRunning(timer) ? "cleared" : "notRunning";
            timerService.clear(timer);
            return res;
        },
        isRunning(timer) {
            return timerService.isRunning(timer);
        }
    };
}