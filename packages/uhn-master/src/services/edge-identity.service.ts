import { KeyObject } from "crypto";
import { EventEmitter } from "events";

import { importPublicKeyBase64 } from "../util/ed25519";
import { subscriptionService } from "./subscription.service";
import { AppLogger } from "@uxp/bff-common";

type EdgePublicKeyPayload = {
    edgeId: string
    publicKey: string
    algorithm: string
    ts: number
}
type EdgeStatus = "online" | "offline";

export type EdgeInfo = {
    edgeId: string;
    status: "online" | "offline" | "unknown";
};


function isEdgeIdentityPayload(obj: unknown): obj is EdgePublicKeyPayload {
    return (
        typeof obj === "object" && obj !== null && obj !== undefined &&
        "edgeId" in obj && "publicKey" in obj && "algorithm" in obj && "ts" in obj
    );
}

function extractEdgeFromTopic(topic: string): string | null {
    const parts = topic.split("/");
    if (parts.length < 3) return null;
    return parts[1];
}


type EdgeIdentityEventMap = {
    edgeStatusChanged: [edgeId: string, status: EdgeStatus];
};

class EdgeIdentityService extends EventEmitter<EdgeIdentityEventMap> {
    private readonly edgeIdentity = new Map<string, KeyObject>();
    private readonly edgeStatus = new Map<string, EdgeStatus>();

    constructor() {
        super();
        subscriptionService.on("edgeIdentity", (topic, payload) => this.handleEdgeIdentity(topic, payload));
        subscriptionService.on("edgeStatus", async (topic, payload) => this.handleEdgeStatus(topic, payload));

    }

    public getAllEdges(): EdgeInfo[] {
        const result: EdgeInfo[] = [];
        for (const edgeId of this.edgeStatus.keys()) {
            result.push({
                edgeId,
                status: this.edgeStatus.get(edgeId) ?? "unknown",
            });
        }
        return result;
    }
    public getEdgeStatus(edgeId: string): EdgeStatus | "unknown" {
        return this.edgeStatus.get(edgeId) ?? "unknown";
    }

    getPublicKey(edgeId: string): KeyObject | undefined {
        return this.edgeIdentity.get(edgeId);
    }

    private async handleEdgeIdentity(topic: string, payload: unknown) {
        if (!isEdgeIdentityPayload(payload)) {
            AppLogger.warn(undefined, {
                message: `[EdgeIdentityService] Received invalid edge identity payload for topic ${topic}`,
                object: { topic, payload }
            });
            return;
        }
        const edgeId = extractEdgeFromTopic(topic);
        if (!edgeId) {
            AppLogger.warn(undefined, {
                message: `[EdgeIdentityService] Received edge identity message with invalid topic: ${topic}`,
                object: { topic, payload }
            });
            return;
        }
        if (payload.algorithm !== "ed25519") {
            AppLogger.warn(undefined, {
                message: `[EdgeIdentityService] Received unsupported algorithm "${payload.algorithm}" for edge ${edgeId}`,
                object: { topic, payload }
            });
            return;
        }
        const publicKey = importPublicKeyBase64(payload.publicKey)
        this.edgeIdentity.set(edgeId, publicKey);

    }
    private handleEdgeStatus(topic: string, payload: unknown) {
        const edgeId = extractEdgeFromTopic(topic);
        if (!edgeId) {
            AppLogger.warn(undefined, {
                message: `[EdgeIdentityService] Received edge status message with invalid topic: ${topic}`,
                object: { topic, payload }
            });
            return;
        }
        if (typeof payload === "string") {
            const status: EdgeStatus = payload === "online" ? "online" : "offline";
            this.edgeStatus.set(edgeId, status);
            this.emit("edgeStatusChanged", edgeId, status);
        }
    }

}

export const edgeIdentityService = new EdgeIdentityService();