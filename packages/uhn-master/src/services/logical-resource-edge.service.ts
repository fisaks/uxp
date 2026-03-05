import mqttService from "./mqtt.service";

type LogicalResourceEdgeCommand = {
    action: "start" | "clear";
    durationMs?: number;
    mode?: "restart" | "startOnce";
};

class LogicalResourceEdgeService {
    sendCommandToEdge(
        resource: { id: string; host: string },
        command: LogicalResourceEdgeCommand
    ) {
        const topic = `uhn/${resource.host}/logical-resource/cmd/${resource.id}`;
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

export const logicalResourceEdgeService = new LogicalResourceEdgeService();
