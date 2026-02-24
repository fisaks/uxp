import { CatalogPayload, DeviceSummary, Range } from "@uhn/common";
import { AppLogger } from "@uxp/bff-common";
import { fnv1a } from "@uxp/common";
import EventEmitter from "events";
import { parseMqttTopic } from "../util/mqtt-topic.util";
import { subscriptionService } from "./subscription.service";

type CatalogEventMap = {
    catalogChanged: [edge: string, payload: EdgeCatalog];
};

export type EdgeCatalog = {
    edge: string;
    devices: DeviceSummary[];
    receivedAt: number;
    fingerprint: string;
};

function isCatalogPayload(obj: unknown): obj is CatalogPayload {
    return (
        typeof obj === "object" && obj !== null && obj !== undefined &&
        "devices" in obj && Array.isArray((obj as CatalogPayload).devices)
    );
}
function rangeKey(r?: Range): string {
    return r ? `${r.start}:${r.count}` : "-";
}
function fingerprintCatalog(payload: CatalogPayload): string {
    const devices = [...payload.devices].sort((a, b) =>
        a.name.localeCompare(b.name)
    );
    const stable = devices.map((d) => [
        d.name,
        rangeKey(d.digitalInputs),
        rangeKey(d.digitalOutputs),
        rangeKey(d.analogInputs),
        rangeKey(d.analogOutputs),
    ].join("|"));

    return fnv1a(stable.join("\n"));
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

        const edge = parseMqttTopic(topic)?.edge ?? null;
        if (!edge) {
            AppLogger.warn(undefined, {
                message: `[PhysicalCatalogService] Unable to extract edge from topic ${topic}`,
                object: { payload }
            });
            return;
        }
        const now = Date.now();
        const newFingerprint = fingerprintCatalog(payload);
        const prev = this.edgeCatalogs.get(edge);

        const next: EdgeCatalog = {
            edge,
            devices: payload.devices,
            receivedAt: now,
            fingerprint: newFingerprint,
        };
        this.edgeCatalogs.set(edge, next);
        if (prev?.fingerprint !== newFingerprint) {
            this.emit("catalogChanged", edge, next);

            AppLogger.isDebugLevel() && AppLogger.debug({
                message: `[PhysicalCatalogService] Updated edge catalog`,
                object: { edge, fingerprint: newFingerprint, deviceCount: payload.devices.length },
            });
        }

    }
    getEdgeCatalog(edge: string): EdgeCatalog | undefined {
        return this.edgeCatalogs.get(edge);
    }

    getAllEdgeCatalogs(): EdgeCatalog[] {
        return Array.from(this.edgeCatalogs.values());
    }
    
    getEdgeDeviceSummary(edge: string, device: string): DeviceSummary | undefined {
        const catalog = this.edgeCatalogs.get(edge);
        if (!catalog) {
            return undefined
        }
        return catalog.devices.find(d => d.name === device);
    }
}

export const physicalCatalogService = new PhysicalCatalogService();