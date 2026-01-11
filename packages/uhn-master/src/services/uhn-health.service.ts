import { UhnHealthId, UhnHealthItem, UhnHealthSnapshot } from "@uhn/common";
import EventEmitter from "events";
import { blueprintResourceService } from "./blueprint-resource.service";
import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { blueprintService } from "./blueprint.service";


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
                message: "Runtime starting",
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
                message: `Runtime restarting attempt ${attempts}`,
                severity: attempts >= 3 ? "error" : "warn",
                action: { label: "Open System Panel", target: { type: "hash", identifier: "system-panel", subPath: "uhn" } },
            });
        });

        blueprintRuntimeSupervisorService.on("ruleRuntimeStopped", () => {
            this.setSuppress(["uhn:resources"]);
            this.upsert({
                id: "uhn:runtime",
                message: "Runtime stopped",
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