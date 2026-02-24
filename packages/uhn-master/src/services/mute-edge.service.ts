import { AppLogger } from "@uxp/bff-common";
import { edgeIdentityService } from "./edge-identity.service";
import mqttService from "./mqtt.service";

export type MuteMQTTPayload = {
    targetType: "rule" | "resource";
    targetId: string;
    action: "mute" | "clearMute";
    expiresAt?: number;
    identifier?: string;
};

class MuteEdgeService {
    /**
     * Broadcasts a mute command to ALL known edges via MQTT.
     * Each edge receives `uhn/{edge}/mute/cmd` and forwards it to its runtime.
     */
    broadcastMuteCommand(payload: MuteMQTTPayload) {
        const edges = edgeIdentityService.getAllEdges();

        if (!edges.length) {
            AppLogger.warn({
                message: `[MuteEdgeService] No known edges to broadcast mute command`,
            });
            return;
        }

        for (const edge of edges) {
            const topic = `uhn/${edge.edgeId}/mute/cmd`;
            mqttService.publish(topic, payload, { retain: false, qos: 0 });
        }

        AppLogger.isDebugLevel() && AppLogger.debug({
            message: `[MuteEdgeService] Broadcast mute command to ${edges.length} edge(s)`,
            object: { payload },
        });
    }
}

export const muteEdgeService = new MuteEdgeService();
