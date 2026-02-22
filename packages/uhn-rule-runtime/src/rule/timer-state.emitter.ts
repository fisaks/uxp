import { runtimeOutput } from "../io/runtime-output";
import { RuntimeTimerService } from "../services/runtime-timer.service";

/**
 * Emits timer state changes to stdout (IPC) so the Go bridge
 * can publish them to MQTT.
 */
export class TimerStateEmitter {
    constructor(timerService: RuntimeTimerService) {
        timerService.on("timerStateChanged", (state) => {
            runtimeOutput.send({
                kind: "event",
                cmd: "timerStateChanged",
                payload: state,
            });
        });
    }
}
