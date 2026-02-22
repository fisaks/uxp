import { RuntimeResource } from "@uhn/common";
import mqttService from "./mqtt.service";

type TimerEdgeCommand = {
    action: "start" | "clear";
    durationMs?: number;
    mode?: "restart" | "startOnce";
};

class TimerEdgeService {
    sendTimerCommandToEdge(
        resource: Pick<RuntimeResource, "id" | "edge">,
        command: TimerEdgeCommand
    ) {
        const topic = `uhn/${resource.edge}/timer/cmd/${resource.id}`;
        const payload = {
            resourceId: resource.id,
            action: command.action,
            durationMs: command.durationMs,
            mode: command.mode,
            timestamp: Date.now(),
        };
        mqttService.publish(topic, payload, { retain: false, qos: 1 });
    }
}

export const timerEdgeService = new TimerEdgeService();
