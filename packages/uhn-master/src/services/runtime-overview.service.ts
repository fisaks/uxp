import { RuntimeInfo, RuntimeOverviewPayload, RuntimeRuleInfo, RuntimeStatus } from "@uhn/common";
import { EventEmitter } from "events";
import { blueprintRuntimeSupervisorService } from "./blueprint-runtime-supervisor.service";
import { blueprintService } from "./blueprint.service";
import { ruleRuntimeProcessService } from "./rule-runtime-process.service";
import { subscriptionService } from "./subscription.service";

function extractEdgeFromTopic(topic: string): string | null {
    const parts = topic.split("/");
    if (parts.length < 3) return null;
    return parts[1];
}

type RuntimeOverviewEventMap = {
    overviewChanged: [payload: RuntimeOverviewPayload];
};

class RuntimeOverviewService extends EventEmitter<RuntimeOverviewEventMap> {
    // All rules from blueprint (grouped by executionTarget)
    private allRules: RuntimeRuleInfo[] = [];

    // Master
    private masterRuntimeStatus: RuntimeStatus = "unconfigured";
    private masterLoadedRuleCount: number | null = null;

    // Edges: keyed by edge name
    private edgeRuntimeStatus = new Map<string, RuntimeStatus>();
    private edgeLoadedRuleCount = new Map<string, number>();

    constructor() {
        super();

        // Master runtime IPC: rulesLoaded
        ruleRuntimeProcessService.on("onRulesLoaded", (msg) => {
            this.masterLoadedRuleCount = msg.rules.length;
            if (msg.allRules) {
                this.allRules = msg.allRules;
            }
            this.emitOverview();
        });

        // Master runtime lifecycle from supervisor
        blueprintRuntimeSupervisorService.on("ruleRuntimeStarting", () => {
            this.masterRuntimeStatus = "starting";
            this.emitOverview();
        });

        blueprintRuntimeSupervisorService.on("ruleRuntimeReady", () => {
            this.masterRuntimeStatus = "running";
            this.emitOverview();
        });

        blueprintRuntimeSupervisorService.on("ruleRuntimeStopped", () => {
            this.masterRuntimeStatus = "stopped";
            this.masterLoadedRuleCount = null;
            this.allRules = [];
            this.edgeLoadedRuleCount.clear();
            this.edgeRuntimeStatus.clear();
            this.emitOverview();
        });

        blueprintRuntimeSupervisorService.on("ruleRuntimeRestarting", () => {
            this.masterRuntimeStatus = "restarting";
            this.masterLoadedRuleCount = null;
            this.emitOverview();
        });

        // Blueprint deactivated → unconfigured
        blueprintService.on("noActiveBlueprint", () => {
            this.masterRuntimeStatus = "unconfigured";
            this.masterLoadedRuleCount = null;
            this.allRules = [];
            this.edgeLoadedRuleCount.clear();
            this.edgeRuntimeStatus.clear();
            this.emitOverview();
        });

        // Edge runtime rule count from MQTT (published as a plain number string)
        subscriptionService.on("edgeRuntimeRules", (topic, payload) => {
            const edgeId = extractEdgeFromTopic(topic);
            if (!edgeId) return;

            if (payload === null || payload === undefined) {
                // Cleared (edge stopped)
                this.edgeLoadedRuleCount.delete(edgeId);
            } else {
                const count = typeof payload === "number" ? payload : parseInt(String(payload), 10);
                if (!isNaN(count)) {
                    this.edgeLoadedRuleCount.set(edgeId, count);
                }
            }
            this.emitOverview();
        });

        // Edge runtime status from MQTT
        subscriptionService.on("edgeRuntimeStatus", (topic, payload) => {
            const edgeId = extractEdgeFromTopic(topic);
            if (!edgeId) return;

            if (typeof payload === "string" && isValidRuntimeStatus(payload)) {
                this.edgeRuntimeStatus.set(edgeId, payload);
            }
            this.emitOverview();
        });
    }

    getOverview(): RuntimeOverviewPayload {
        return this.buildOverview();
    }

    private buildOverview(): RuntimeOverviewPayload {
        const rulesByTarget = this.groupRulesByTarget();
        const runtimes: RuntimeInfo[] = [];

        // Master runtime
        const masterRules = rulesByTarget.get("master") ?? [];
        runtimes.push({
            runtimeId: "master",
            status: this.masterRuntimeStatus,
            expectedRuleCount: masterRules.length,
            loadedRuleCount: this.masterLoadedRuleCount,
            rules: masterRules,
        });

        // Collect all known edge names (from rules + status + loaded counts)
        const edgeNames = new Set<string>();
        for (const [target] of rulesByTarget) {
            if (target !== "master") edgeNames.add(target);
        }
        for (const edgeId of this.edgeRuntimeStatus.keys()) edgeNames.add(edgeId);
        for (const edgeId of this.edgeLoadedRuleCount.keys()) edgeNames.add(edgeId);

        for (const edgeId of Array.from(edgeNames).sort()) {
            const edgeRules = rulesByTarget.get(edgeId) ?? [];
            runtimes.push({
                runtimeId: edgeId,
                status: this.edgeRuntimeStatus.get(edgeId) ?? "unconfigured",
                expectedRuleCount: edgeRules.length,
                loadedRuleCount: this.edgeLoadedRuleCount.get(edgeId) ?? null,
                rules: edgeRules,
            });
        }

        return {
            runtimes,
            updatedAt: Date.now(),
        };
    }

    private groupRulesByTarget(): Map<string, RuntimeRuleInfo[]> {
        const grouped = new Map<string, RuntimeRuleInfo[]>();
        for (const rule of this.allRules) {
            const target = rule.executionTarget ?? "master";
            let list = grouped.get(target);
            if (!list) {
                list = [];
                grouped.set(target, list);
            }
            list.push(rule);
        }
        return grouped;
    }

    private emitOverview() {
        const overview = this.buildOverview();
        this.emit("overviewChanged", overview);
    }
}

const VALID_RUNTIME_STATUSES: Set<string> = new Set(["unconfigured", "starting", "running", "stopped", "restarting", "failed"]);

function isValidRuntimeStatus(value: string): value is RuntimeStatus {
    return VALID_RUNTIME_STATUSES.has(value);
}

export const runtimeOverviewService = new RuntimeOverviewService();
