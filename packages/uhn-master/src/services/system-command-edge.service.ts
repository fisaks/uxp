import { edgeIdentityService } from "./edge-identity.service";
import mqttService from "./mqtt.service";

export type EdgeSystemCommand = {
    action: string;
    payload?: Record<string, unknown>;
};

class SystemCommandEdgeService {

    publishToEdge(edgeId: string, command: EdgeSystemCommand): void {
        const topic = `uhn/${edgeId}/cmd`;
        mqttService.publish(topic, command, { retain: false, qos: 1 });
    }

    publishToAllEdges(command: EdgeSystemCommand): void {
        for (const { edgeId, status } of edgeIdentityService.getAllEdges()) {
            if (status === "online") {
                this.publishToEdge(edgeId, command);
            }
        }
    }
}

export const systemCommandEdgeService = new SystemCommandEdgeService();
