import { CatalogPayload, DeviceSummary } from "@uhn/common";
import EventEmitter from "events";
import { subscriptionService } from "./subscription.service";
import { AppLogger } from "@uxp/bff-common";

export type CatalogEventMap = {
    catalogChanged: [edge: string, payload: EdgeCatalog];
};

export type EdgeCatalog = {
    edge: string;
    devices: DeviceSummary[];
    receivedAt: number;
    raw: CatalogPayload;
};

function isCatalogPayload(obj: unknown): obj is CatalogPayload {
    return (
        typeof obj === "object" && obj !== null && obj !== undefined &&
        "devices" in obj && Array.isArray((obj as CatalogPayload).devices)
    );
}
// Parse edge name: uhn/<edge>/catalog
function extractEdgeFromTopic(topic: string): string | null {
    const parts = topic.split("/");
    if (parts.length < 3) return null;
    return parts[1];
}
class PhysicalCatalogService extends EventEmitter<CatalogEventMap> {
    private edgeCatalogs: Map<string, EdgeCatalog> = new Map();
    constructor() {
        super();
        subscriptionService.on("catalog", (topic, payload) => this.handleCatalog(topic, payload));

    }
    private handleCatalog(topic: string, payload: unknown) {
        if (!isCatalogPayload(payload)) {
            AppLogger.warn(undefined, {
                message: `[PhysicalCatalogService] Invalid payload for topic ${topic}`,
                object: { topic, payload }
            });
            return;
        }

        const edge = extractEdgeFromTopic(topic);
        if (!edge) {
            AppLogger.warn(undefined, {
                message: `[PhysicalCatalogService] Unable to extract edge from topic ${topic}`,
                object: { payload }
            });
            return;
        }

        const catalog: EdgeCatalog = {
            edge,
            devices: payload.devices,
            receivedAt: Date.now(),
            raw: payload,
        };
        this.edgeCatalogs.set(edge, catalog);
        this.emit("catalogChanged", edge, catalog);

        AppLogger.isDebugLevel() && AppLogger.debug({
            message: `[PhysicalCatalogService] Updated edge catalog`,
            object: { edge, catalog }
        });
    }
    getEdgeCatalog(edge: string): EdgeCatalog | undefined {
        return this.edgeCatalogs.get(edge);
    }

    getAllEdgeCatalogs(): EdgeCatalog[] {
        return Array.from(this.edgeCatalogs.values());
    }
}

export const physicalCatalogService = new PhysicalCatalogService();