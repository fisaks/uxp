import { UhnLogLevel, UhnRuntimeConfig, UhnRuntimeMode, UhnSystemSnapshot } from "@uhn/common";
import { runBackgroundTask } from "@uxp/bff-common";
import EventEmitter from "events";
import { parseMqttTopic } from "../util/mqtt-topic.util";
import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { blueprintService } from "./blueprint.service";
import { edgeIdentityService } from "./edge-identity.service";
import { runtimeOverviewService } from "./runtime-overview.service";
import { subscriptionService } from "./subscription.service";
import { systemConfigService } from "./system-config.service";
const { AppDataSource } = require("../db/typeorm.config");

type SystemSnapshotEventMap = {
    snapshotChanged: [snapshot: UhnSystemSnapshot];
};

/**
 * Builds and maintains the UhnSystemSnapshot — a combined view of all runtime
 * configs (master + edges) plus blueprint status, pushed to the UI via WebSocket.
 * Merges data from: system config (master logLevel/runMode), RuntimeOverviewService
 * (per-runtime status), edge MQTT config (edge logLevel/runMode), and edge identity
 * (online/offline). Rebuilds are debounced and serialized to avoid redundant work.
 */
class UhnSystemSnapshotService extends EventEmitter<SystemSnapshotEventMap> {
    private snapshot!: UhnSystemSnapshot;
    private readonly edgeConfigs = new Map<string, { logLevel: string; runMode: string; debugPort?: number }>();

    private emitScheduled = false;

    // async rebuild control
    private rebuildRunning = false;
    private rebuildPending = false;

    constructor() {
        super();

        // ── System config ───────────────────────────────
        systemConfigService.on("configChanged", () => this.requestRebuild());

        // ── Runtime supervisor ──────────────────────────
        blueprintRuntimeSupervisorService.on("ruleRuntimeStarting", () => this.requestRebuild());
        blueprintRuntimeSupervisorService.on("ruleRuntimeReady", () => this.requestRebuild());
        blueprintRuntimeSupervisorService.on("ruleRuntimeStopped", () => this.requestRebuild());
        blueprintRuntimeSupervisorService.on("ruleRuntimeRestarting", () => this.requestRebuild());

        // ── Blueprint lifecycle ─────────────────────────
        blueprintService.on("blueprintInstalled", () => this.requestRebuild());
        blueprintService.on("noActiveBlueprint", () => this.requestRebuild());

        // ── Edge system config (from MQTT) ──────────────
        subscriptionService.on("edgeSystemConfig", (topic, payload) => {
            const edgeId = parseMqttTopic(topic)?.edge;
            if (!edgeId) return;
            if (isEdgeMqttConfig(payload)) {
                this.edgeConfigs.set(edgeId, { logLevel: payload.logLevel, runMode: payload.runMode, debugPort: payload.debugPort });
                this.requestRebuild();
            }
        });

        // ── Edge runtime status changes ─────────────────
        runtimeOverviewService.on("overviewChanged", () => this.requestRebuild());

        // ── Edge offline → clear stale config ────────────
        edgeIdentityService.on("edgeStatusChanged", (edgeId, status) => {
            if (status === "offline") {
                this.edgeConfigs.delete(edgeId);
                this.requestRebuild();
            }
        });

        // initial async build (fire-and-forget)
        // this.requestRebuild();
    }

    /** Public accessor (used on WS subscribe) */
    getSnapshot(): UhnSystemSnapshot {
        return this.snapshot;
    }

    /** Request a rebuild (debounced + serialized) */
    private requestRebuild() {
        if (this.rebuildRunning) {
            this.rebuildPending = true;
            return;
        }

        void this.runRebuild();
    }

    /** Serialized async rebuild */
    private async runRebuild() {
        this.rebuildRunning = true;

        try {
            await this.rebuild();
        } finally {
            this.rebuildRunning = false;

            if (this.rebuildPending) {
                this.rebuildPending = false;
                this.requestRebuild();
            }
        }
    }

    /** Rebuild snapshot from authoritative sources */
    private async rebuild() {
        if (!systemConfigService.isInitialized()) return;

        await runBackgroundTask(AppDataSource, async () => {
            const cfg = systemConfigService.getConfig();
            const blueprint = await blueprintService.getActiveBlueprint();
            const overview = runtimeOverviewService.getOverview();

            const runtimes: Record<string, UhnRuntimeConfig> = {};

            // Master entry
            const masterOverview = overview.runtimes.find(r => r.runtimeId === "master");
            runtimes["master"] = {
                logLevel: cfg.logLevel,
                runMode: cfg.runtimeMode,
                debugPort: cfg.debugPort,
                runtimeStatus: masterOverview?.status ?? "stopped",
                nodeOnline: true,
            };

            // Edge entries from RuntimeOverview
            for (const runtime of overview.runtimes) {
                if (runtime.runtimeId === "master") continue;
                const mqttCfg = this.edgeConfigs.get(runtime.runtimeId);
                runtimes[runtime.runtimeId] = {
                    logLevel: (mqttCfg?.logLevel ?? "info") as UhnLogLevel,
                    runMode: (mqttCfg?.runMode ?? "normal") as UhnRuntimeMode,
                    debugPort: mqttCfg?.debugPort,
                    runtimeStatus: runtime.status,
                    nodeOnline: edgeIdentityService.getEdgeStatus(runtime.runtimeId) === "online",
                };
            }

            // Include edges with config but not yet in RuntimeOverview
            for (const [edgeId, mqttCfg] of this.edgeConfigs) {
                if (!runtimes[edgeId]) {
                    runtimes[edgeId] = {
                        logLevel: mqttCfg.logLevel as UhnLogLevel,
                        runMode: mqttCfg.runMode as UhnRuntimeMode,
                        debugPort: mqttCfg.debugPort,
                        runtimeStatus: runtimeOverviewService.getEdgeRuntimeStatus(edgeId) ?? "stopped",
                        nodeOnline: edgeIdentityService.getEdgeStatus(edgeId) === "online",
                    };
                }
            }

            this.snapshot = {
                runtimes,
                blueprint: {
                    active: blueprint !== undefined,
                    hasErrors: blueprint?.status !== "compiled",
                },
                updatedAt: Date.now(),
            };

            this.scheduleEmit();
        });
    }

    /** Batch emissions like health service */
    private scheduleEmit() {
        if (this.emitScheduled) return;

        this.emitScheduled = true;

        queueMicrotask(() => {
            this.emitScheduled = false;
            this.emit("snapshotChanged", this.snapshot);
        });
    }
}

function isEdgeMqttConfig(obj: unknown): obj is { logLevel: string; runMode: string; debugPort?: number } {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "logLevel" in obj &&
        "runMode" in obj &&
        typeof (obj as Record<string, unknown>).logLevel === "string" &&
        typeof (obj as Record<string, unknown>).runMode === "string"
    );
}

export const uhnSystemSnapshotService = new UhnSystemSnapshotService();
