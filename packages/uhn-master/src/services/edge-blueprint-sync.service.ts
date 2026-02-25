import { AppLogger } from "@uxp/bff-common";
import { EventEmitter } from "events";
import { parseMqttTopic } from "../util/mqtt-topic.util";
import { blueprintService } from "./blueprint.service";
import { edgeIdentityService } from "./edge-identity.service";
import { runtimeOverviewService } from "./runtime-overview.service";
import { subscriptionService } from "./subscription.service";

type BlueprintInfo = { identifier: string; version: number; sha256: string };

type EdgeBlueprintSyncEventMap = {
    edgeBlueprintMismatch: [edgeId: string, edge: BlueprintInfo, master: BlueprintInfo];
    edgeBlueprintSynced: [edgeId: string];
    edgeBlueprintMissing: [edgeId: string];
    edgeBlueprintPendingClear: [edgeId: string];
};

function isEdgeBlueprintPayload(obj: unknown): obj is BlueprintInfo {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "identifier" in obj &&
        "version" in obj &&
        "sha256" in obj &&
        typeof (obj as BlueprintInfo).sha256 === "string"
    );
}

class EdgeBlueprintSyncService extends EventEmitter<EdgeBlueprintSyncEventMap> {
    private masterBlueprint: BlueprintInfo | null = null;
    private readonly edgeBlueprints = new Map<string, BlueprintInfo | null>();

    constructor() {
        super();

        blueprintService.on("blueprintInstalled", (identifier, version, sha256) => {
            this.masterBlueprint = { identifier, version, sha256 };
            this.recheckAllEdges();
        });

        blueprintService.on("noActiveBlueprint", () => {
            this.masterBlueprint = null;
            // Don't clear edge items immediately — edges still have the old
            // blueprint running and need time to deactivate. Each edge will
            // report its cleared state individually via edgeBlueprintActivated.
            this.recheckAllEdges();
        });

        subscriptionService.on("edgeBlueprintActivated", (topic, payload) => {
            const edgeId = parseMqttTopic(topic)?.edge ?? null;
            if (!edgeId) return;

            if (payload === null || payload === undefined) {
                this.edgeBlueprints.set(edgeId, null);
            } else if (isEdgeBlueprintPayload(payload)) {
                this.edgeBlueprints.set(edgeId, {
                    identifier: payload.identifier,
                    version: payload.version,
                    sha256: payload.sha256,
                });
            } else {
                AppLogger.warn(undefined, {
                    message: `[EdgeBlueprintSyncService] Invalid blueprint payload from edge ${edgeId}`,
                    object: { topic, payload },
                });
                return;
            }

            this.recheckEdge(edgeId);
        });

        edgeIdentityService.on("edgeStatusChanged", (edgeId, status) => {
            if (status === "online" && !this.edgeBlueprints.has(edgeId)) {
                // Edge came online but hasn't reported a blueprint yet
                this.recheckEdge(edgeId);
            }
        });
    }

    private recheckEdge(edgeId: string) {
        // Edge without its own runtime doesn't run blueprints — skip it
        if (runtimeOverviewService.getEdgeRuntimeStatus(edgeId) === "unconfigured") {
            this.emit("edgeBlueprintSynced", edgeId);
            return;
        }

        const edgeBp = this.edgeBlueprints.get(edgeId);

        if (!this.masterBlueprint) {
            if (edgeBp === undefined || edgeBp === null) {
                // Both master and edge have no blueprint — in sync
                this.emit("edgeBlueprintSynced", edgeId);
            } else {
                // Edge still has the old blueprint, waiting for it to clear
                this.emit("edgeBlueprintPendingClear", edgeId);
            }
            return;
        }

        // Master has an active blueprint
        if (edgeBp === undefined || edgeBp === null) {
            this.emit("edgeBlueprintMissing", edgeId);
            return;
        }

        if (edgeBp.sha256 === this.masterBlueprint.sha256) {
            this.emit("edgeBlueprintSynced", edgeId);
        } else {
            this.emit("edgeBlueprintMismatch", edgeId, edgeBp, this.masterBlueprint);
        }
    }

    private recheckAllEdges() {
        // Check edges that have reported a blueprint
        for (const edgeId of this.edgeBlueprints.keys()) {
            this.recheckEdge(edgeId);
        }
        // Also check known-online edges that haven't reported a blueprint yet
        for (const { edgeId, status } of edgeIdentityService.getAllEdges()) {
            if (status === "online" && !this.edgeBlueprints.has(edgeId)) {
                this.recheckEdge(edgeId);
            }
        }
    }
}

export const edgeBlueprintSyncService = new EdgeBlueprintSyncService();
