import mqttService from "./mqtt.service";

type TimerEdgeCommand = {
    action: "start" | "clear";
    durationMs?: number;
    mode?: "restart" | "startOnce";
};

class TimerEdgeService {
    sendTimerCommandToEdge(
        resource: { id: string; host: string },
        command: TimerEdgeCommand
    ) {
        const topic = `uhn/${resource.host}/timer/cmd/${resource.id}`;
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
