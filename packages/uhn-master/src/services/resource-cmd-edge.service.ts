import mqttService from "./mqtt.service";

type ResourceCmdEdgeCommand = {
    action: "start" | "clear" | "tap" | "longPress" | "setState" | "action" | "setActionOutput";
    value?: boolean | number | string;
    durationMs?: number;
    mode?: "restart" | "startOnce";
    simulateHold?: boolean;
    metadata?: Record<string, unknown>;
    /** Loop prevention depth counter for emitAction relay. */
    depth?: number;
    /** When true, setState updates the value without triggering rules on the edge. */
    silent?: boolean;
};

/**
 * Forwards resource commands from the master to an edge via MQTT.
 * Publishes to `uhn/{edge}/resource/cmd/{resourceId}` — the edge's
 * ResourceCmdSubscriber picks these up and routes to the runtime or driver.
 *
 * Used by CommandsResourceService for: tap, longPress, timer start/clear,
 * setState (virtual inputs), and action (actionInput) commands originating
 * from the UI or master-side rule dispatch.
 */
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
            metadata: command.metadata,
            timestamp: Date.now(),
            depth: command.depth,
            silent: command.silent,
        };
        mqttService.publish(topic, payload, { retain: false, qos: 1 });
    }
}

export const resourceCmdEdgeService = new ResourceCmdEdgeService();
