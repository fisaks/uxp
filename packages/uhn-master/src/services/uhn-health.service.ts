import { UhnHealthId, UhnHealthItem, UhnHealthSnapshot } from "@uhn/common";
import EventEmitter from "events";
import { parseMqttTopic } from "../util/mqtt-topic.util";
import { blueprintResourceService } from "./blueprint-resource.service";
import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { blueprintService } from "./blueprint.service";
import { edgeBlueprintSyncService } from "./edge-blueprint-sync.service";
import { edgeIdentityService } from "./edge-identity.service";
import { subscriptionService } from "./subscription.service";


type UhnHealthEventMap = {
    healthChanged: [snapshot: UhnHealthSnapshot];
};
class UhnHealthService extends EventEmitter<UhnHealthEventMap> {
    private readonly appId = "uhn" as const;
    private items = new Map<string, UhnHealthItem>();
    // Suppression hides derived health items when a root cause
    // (e.g. inactive blueprint) makes them non-actionable.
    private suppress = new Map<UhnHealthId, boolean>();
    private emitScheduled = false;
    constructor() {
        super();
        // ── Blueprint service ───────────────────────────────
        blueprintService.on("blueprintActivating", (id, v) => {
            this.setSuppress(["uhn:runtime", "uhn:resources"]);
            this.upsert({
                id: "uhn:blueprint",
                message: `Activating blueprint ${id} v${v}`,
                severity: "warn",
            });
        });
        blueprintService.on("blueprintInstalled", () => {
            this.clearSuppress(["uhn:runtime", "uhn:resources"])
            this.remove("uhn:blueprint");
        });
        blueprintService.on("blueprintCompileFailed", (_id, _v, _err) => {
            //this.setSuppress(["uhn:runtime", "uhn:resources"]);
            this.clearSuppress(["uhn:runtime", "uhn:resources"])
            this.upsert({
                id: "uhn:blueprint",
                message: "Blueprint compile failed",
                severity: "warn",
                action: { label: "Go To Blueprints", target: { type: "route", identifier: "unified-home-network", subPath: "/blueprints/upload" } },
            });
        });
        blueprintService.on("blueprintDeactivating", () => {
            this.setSuppress(["uhn:runtime", "uhn:resources"]);
            this.upsert({
                id: "uhn:blueprint",
                message: "Deactivating blueprint",
                severity: "warn",
                action: { label: "Go To Blueprints", target: { type: "route", identifier: "unified-home-network", subPath: "/blueprints" } },
            });
        });
        blueprintService.on("noActiveBlueprint", () => {
            this.setSuppress(["uhn:runtime", "uhn:resources"]);
            this.upsert({
                id: "uhn:blueprint",
                message: "No active blueprint",
                severity: "error",
                action: { label: "Go To Blueprints", target: { type: "route", identifier: "unified-home-network", subPath: "/blueprints/upload" } },
            });
        });

        // ── Runtime supervisor ──────────────────────────────
        blueprintRuntimeSupervisorService.on("ruleRuntimeStarting", () => {
            this.setSuppress(["uhn:resources"]);
            this.upsert({
                id: "uhn:runtime",
                message: "Master runtime starting",
                severity: "warn",
                action: { label: "Open System Panel", target: { type: "hash", identifier: "system-panel", subPath: "uhn" } },
            });
        });

        blueprintRuntimeSupervisorService.on("ruleRuntimeReady", () => {
            this.clearSuppress(["uhn:resources"]);
            this.remove("uhn:runtime");
        });

        blueprintRuntimeSupervisorService.on("ruleRuntimeRestarting", (attempts) => {
            this.setSuppress(["uhn:resources"]);
            this.upsert({
                id: "uhn:runtime",
                message: `Master runtime restarting attempt ${attempts}`,
                severity: attempts >= 3 ? "error" : "warn",
                action: { label: "Open System Panel", target: { type: "hash", identifier: "system-panel", subPath: "uhn" } },
            });
        });

        blueprintRuntimeSupervisorService.on("ruleRuntimeStopped", () => {
            this.setSuppress(["uhn:resources"]);
            this.upsert({
                id: "uhn:runtime",
                message: "Master runtime stopped",
                severity: "error",
                action: { label: "Open System Panel", target: { type: "hash", identifier: "system-panel", subPath: "uhn" } },
            });
        });

        // ── Resource service ────────────────────────────────
        blueprintResourceService.on("resourcesReloaded", (_res, validationErrors) => {
            if (validationErrors.length === 0) {
                this.remove("uhn:resources");
            } else {
                this.upsert({
                    id: "uhn:resources",
                    message: `Resource validation errors (${validationErrors.length})`,
                    severity: "warn",
                    action: { label: "Go To Resources", target: { type: "route", identifier: "unified-home-network", subPath: "/resources" } },
                });
            }
        });

        blueprintResourceService.on("resourcesCleared", () => {
            this.upsert({
                id: "uhn:resources",
                message: "No resources loaded",
                severity: "warn",
                action: { label: "Go To Blueprints", target: { type: "route", identifier: "unified-home-network", subPath: "/blueprints/upload" } },
            });
        });

        blueprintResourceService.on("error", (err) => {
            this.upsert({
                id: "uhn:resources",
                message: "Could not load resources",
                severity: "error",
                action: { label: "Go To Blueprints", target: { type: "route", identifier: "unified-home-network", subPath: "/blueprints/upload" } }
                ,
            });
        });

        // ── Edge status (edgeIdentityService) ─────────────
        edgeIdentityService.on("edgeStatusChanged", (edgeId, status) => {
            const statusId: UhnHealthId = `uhn:edge:${edgeId}:status`;
            const runtimeId: UhnHealthId = `uhn:edge:${edgeId}:runtime`;
            const blueprintId: UhnHealthId = `uhn:edge:${edgeId}:blueprint`;

            if (status === "offline") {
                this.upsert({
                    id: statusId,
                    message: `Edge '${edgeId}' is offline`,
                    severity: "error",
                    action: { label: "Open System Panel", target: { type: "hash", identifier: "system-panel", subPath: "uhn" } },
                });
                this.setSuppress([runtimeId, blueprintId]);
            } else {
                this.remove(statusId);
                this.clearSuppress([runtimeId, blueprintId]);
            }
        });

        // ── Edge runtime (subscriptionService) ────────────
        subscriptionService.on("edgeRuntimeStatus", (topic, payload) => {
            const edgeId = parseMqttTopic(topic)?.edge ?? null;
            if (!edgeId) return;

            const runtimeId: UhnHealthId = `uhn:edge:${edgeId}:runtime`;
            const action: UhnHealthItem["action"] = { label: "Open System Panel", target: { type: "hash", identifier: "system-panel", subPath: "uhn" } };

            switch (payload) {
                case "running":
                case "unconfigured":
                    this.remove(runtimeId);
                    break;
                case "stopped":
                case "failed":
                    this.upsert({ id: runtimeId, message: `Edge '${edgeId}' runtime ${payload}`, severity: "error", action });
                    break;
                case "restarting":
                case "starting":
                    this.upsert({ id: runtimeId, message: `Edge '${edgeId}' runtime ${payload}`, severity: "warn", action });
                    break;
            }
        });

        // ── Edge blueprint sync ───────────────────────────
        edgeBlueprintSyncService.on("edgeBlueprintMismatch", (edgeId, edge, master) => {
            this.upsert({
                id: `uhn:edge:${edgeId}:blueprint`,
                message: `Edge '${edgeId}' running different blueprint (v${edge.version} vs master v${master.version})`,
                severity: "warn",
                action: { label: "Open System Panel", target: { type: "hash", identifier: "system-panel", subPath: "uhn" } },
            });
        });

        edgeBlueprintSyncService.on("edgeBlueprintSynced", (edgeId) => {
            this.remove(`uhn:edge:${edgeId}:blueprint`);
        });

        edgeBlueprintSyncService.on("edgeBlueprintMissing", (edgeId) => {
            this.upsert({
                id: `uhn:edge:${edgeId}:blueprint`,
                message: `Edge '${edgeId}' has no active blueprint`,
                severity: "warn",
                action: { label: "Open System Panel", target: { type: "hash", identifier: "system-panel", subPath: "uhn" } },
            });
        });

        edgeBlueprintSyncService.on("edgeBlueprintPendingClear", (edgeId) => {
            this.upsert({
                id: `uhn:edge:${edgeId}:blueprint`,
                message: `Edge '${edgeId}' still has blueprint, pending deactivation`,
                severity: "warn",
                action: { label: "Open System Panel", target: { type: "hash", identifier: "system-panel", subPath: "uhn" } },
            });
        });

        // Suppress all edge blueprint items during master blueprint transitions
        blueprintService.on("blueprintActivating", () => {
            this.setSuppressByPrefix("uhn:edge:", ":blueprint");
        });
        blueprintService.on("blueprintInstalled", () => {
            this.clearSuppressByPrefix("uhn:edge:", ":blueprint");
        });
        blueprintService.on("blueprintCompileFailed", () => {
            this.setSuppressByPrefix("uhn:edge:", ":blueprint");
        });
    }

    getHealthSnapshot(): UhnHealthSnapshot {
        return {
            appId: this.appId,
            items: Array.from(this.items.values()).filter(item => !this.isSuppressed(item.id)),
            updatedAt: new Date().toISOString(),
        };
    }

    private setSuppress(ids: UhnHealthId[]) {
        ids.forEach(id => this.suppress.set(id, true));
        this.scheduleEmit();
    }
    private isSuppressed(id: UhnHealthId): boolean {
        return this.suppress.get(id) === true;
    }
    private clearSuppress(ids: UhnHealthId[]) {
        ids.forEach(id => this.suppress.delete(id));
        this.scheduleEmit();
    }
    private upsert(item: UhnHealthItem) {
        this.items.set(item.id, item);
        // Maybe optimize later to only emit if changed
        this.scheduleEmit();
    }
    private remove(id: string) {
        if (this.items.delete(id)) {
            this.scheduleEmit();
        }
    }
    private removeByPrefix(prefix: string, suffix: string) {
        let changed = false;
        for (const key of this.items.keys()) {
            if (key.startsWith(prefix) && key.endsWith(suffix)) {
                this.items.delete(key);
                changed = true;
            }
        }
        if (changed) this.scheduleEmit();
    }
    private setSuppressByPrefix(prefix: string, suffix: string) {
        for (const key of this.items.keys()) {
            if (key.startsWith(prefix) && key.endsWith(suffix)) {
                this.suppress.set(key as UhnHealthId, true);
            }
        }
        this.scheduleEmit();
    }
    private clearSuppressByPrefix(prefix: string, suffix: string) {
        for (const key of this.suppress.keys()) {
            if (key.startsWith(prefix) && key.endsWith(suffix)) {
                this.suppress.delete(key);
            }
        }
        this.scheduleEmit();
    }
    private scheduleEmit() {
        if (this.emitScheduled) return;

        this.emitScheduled = true;

        queueMicrotask(() => {
            this.emitScheduled = false;
            this.emit("healthChanged", this.getHealthSnapshot());
        });
    }
}

export const uhnHealthService = new UhnHealthService();