// system/system-snapshot.service.ts
import { UhnSystemSnapshot } from "@uhn/common";
import { runBackgroundTask } from "@uxp/bff-common";
import EventEmitter from "events";
import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { blueprintService } from "./blueprint.service";
import { systemConfigService } from "./system-config.service";
const { AppDataSource } = require("../db/typeorm.config");

type SystemSnapshotEventMap = {
    snapshotChanged: [snapshot: UhnSystemSnapshot];
};

class UhnSystemSnapshotService extends EventEmitter<SystemSnapshotEventMap> {
    private snapshot!: UhnSystemSnapshot;

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
        await runBackgroundTask(AppDataSource, async () => {
            const cfg = systemConfigService.getConfig();
            const blueprint = await blueprintService.getActiveBlueprint();

            this.snapshot = {
                runtime: {
                    running: blueprintRuntimeSupervisorService.isRunning(),
                    runMode: cfg.runtimeMode,
                    logLevel: cfg.logLevel,
                },
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

export const uhnSystemSnapshotService = new UhnSystemSnapshotService();
