import { HealthId, HealthItem, HealthSnapshot } from "@uhn/common";
import EventEmitter from "events";
import { blueprintResourceService } from "./blueprint-resource.service";
import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { blueprintService } from "./blueprint.service";


type UhnHealthEventMap = {
    healthChanged: [snapshot: HealthSnapshot];
};
class UhnHealthService extends EventEmitter<UhnHealthEventMap> {
    private readonly appId = "uhn" as const;
    private items = new Map<string, HealthItem>();
    // Suppression hides derived health items when a root cause
    // (e.g. inactive blueprint) makes them non-actionable.
    private suppress = new Map<HealthId, boolean>();
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
            this.setSuppress(["uhn:runtime", "uhn:resources"]);
            this.upsert({
                id: "uhn:blueprint",
                message: "Blueprint compile failed",
                severity: "error",
                action: { label: "Go To Blueprints", target: { type: "route", value: "uhn" } },
            });
        });
        blueprintService.on("blueprintDeactivating", () => {
            this.setSuppress(["uhn:runtime", "uhn:resources"]);
            this.upsert({
                id: "uhn:blueprint",
                message: "Deactivating blueprint",
                severity: "warn",
                action: { label: "Go To Blueprints", target: { type: "route", value: "uhn" } },
            });
        });
        blueprintService.on("noActiveBlueprint", () => {
            this.setSuppress(["uhn:runtime", "uhn:resources"]);
            this.upsert({
                id: "uhn:blueprint",
                message: "No active blueprint",
                severity: "error",
                action: { label: "Go To Blueprints", target: { type: "route", value: "uhn" } },
            });
        });

        // ── Runtime supervisor ──────────────────────────────
        blueprintRuntimeSupervisorService.on("ruleRuntimeStarting", () => {
            this.setSuppress(["uhn:resources"]);
            this.upsert({
                id: "uhn:runtime",
                message: "Runtime starting",
                severity: "warn",
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
                action: { label: "Open System Panel", target: { type: "systemPanel", value: "uhn" } },
            });
        });

        blueprintRuntimeSupervisorService.on("ruleRuntimeStopped", () => {
            this.setSuppress(["uhn:resources"]);
            this.upsert({
                id: "uhn:runtime",
                message: "Runtime stopped",
                severity: "error",
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
                });
            }
        });

        blueprintResourceService.on("resourcesCleared", () => {
            this.upsert({
                id: "uhn:resources",
                message: "No resources loaded",
                severity: "warn",
            });
        });

        blueprintResourceService.on("error", (err) => {
            this.upsert({
                id: "uhn:resources",
                message: "Could not load resources",
                severity: "error",
                action: { label: "Go To Blueprints", target: { type: "route", value: "uhn" } },
            });
        });
    }

    getHealthSnapshot(): HealthSnapshot {
        return {
            appId: this.appId,
            items: Array.from(this.items.values()).filter(item => !this.isSuppressed(item.id)),
            updatedAt: new Date().toISOString(),
        };
    }

    private setSuppress(ids: HealthId[]) {
        ids.forEach(id => this.suppress.set(id, true));
        this.scheduleEmit();
    }
    private isSuppressed(id: HealthId): boolean {
        return this.suppress.get(id) === true;
    }
    private clearSuppress(ids: HealthId[]) {
        ids.forEach(id => this.suppress.delete(id));
        this.scheduleEmit();
    }
    private upsert(item: HealthItem) {
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