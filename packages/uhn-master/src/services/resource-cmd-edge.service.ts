import mqttService from "./mqtt.service";

type ResourceCmdEdgeCommand = {
    action: "start" | "clear" | "tap" | "longPress" | "setState";
    value?: boolean | number;
    durationMs?: number;
    mode?: "restart" | "startOnce";
    simulateHold?: boolean;
};

class ResourceCmdEdgeService {
    sendCommandToEdge(
        resource: { id: string; host: string },
        command: ResourceCmdEdgeCommand
    ) {
        const topic = `uhn/${resource.host}/resource/cmd/${resource.id}`;
        const payload = {
            resourceId: resource.id,
            action: command.action,
            value: command.value,
            durationMs: command.durationMs,
            mode: command.mode,
            simulateHold: command.simulateHold,
            timestamp: Date.now(),
        };
        mqttService.publish(topic, payload, { retain: false, qos: 1 });
    }
}

export const resourceCmdEdgeService = new ResourceCmdEdgeService();
