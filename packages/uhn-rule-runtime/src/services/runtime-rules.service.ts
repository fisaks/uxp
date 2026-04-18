// services/runtime-rules.service.ts
import { BlueprintRule, isBlueprintRule, RuleTrigger } from "@uhn/blueprint";
import { RuntimeRuleInfo, RuntimeRuleTriggerInfo } from "@uhn/common";
import fs from "fs-extra";
import path from "path";
import { runtimeOutput } from "../io/runtime-output";
import { isScheduleTrigger } from "../rule/rule-engine.utils";
import { RuntimeMode } from "../types/rule-runtime.type";



async function collectRules(rulesDir: string): Promise<BlueprintRule[]> {
    const rules: BlueprintRule[] = [];

    if (!(await fs.pathExists(rulesDir))) {
        console.warn(`[rule-runtime] rules directory not found: ${rulesDir}`);
        return rules;
    }

    async function walk(dir: string) {
        const entries = await fs.readdir(dir);

        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory()) {
                await walk(fullPath);
                continue;
            }

            if (!stat.isFile() || !entry.endsWith(".js")) continue;

            const mod = require(fullPath);


            for (const exported of Object.values(mod)) {
                if (isBlueprintRule(exported)) {
                    rules.push(exported);
                }
            }
        }
    }

    await walk(rulesDir);
    return rules;
}

type RuleIndex = {
    byResourceId: Map<string, BlueprintRule[]>;
    bySchedulePhase: Map<string, BlueprintRule[]>;
};

function indexRules(rules: BlueprintRule[]): RuleIndex {
    const byResourceId = new Map<string, Set<BlueprintRule>>();
    const bySchedulePhase = new Map<string, Set<BlueprintRule>>();

    for (const rule of rules) {
        for (const t of rule.triggers) {
            if (isScheduleTrigger(t)) {
                const schedulePhaseId = `${t.phase.scheduleId}.${t.phase.id}`;
                let set = bySchedulePhase.get(schedulePhaseId);
                if (!set) {
                    set = new Set();
                    bySchedulePhase.set(schedulePhaseId, set);
                }
                set.add(rule);
                continue;
            }

            const resourceId = t.resource?.id;
            if (!resourceId) {
                runtimeOutput.log({
                    level: "warn",
                    component: "RuntimeRulesService",
                    message: `[rule-runtime] Rule "${rule.id}" has a trigger with missing resource id (skipping)`,
                });
                continue;
            }

            let set = byResourceId.get(resourceId);
            if (!set) {
                set = new Set();
                byResourceId.set(resourceId, set);
            }

            set.add(rule);
        }
    }

    const sortByPriority = (map: Map<string, Set<BlueprintRule>>): Map<string, BlueprintRule[]> => {
        const result = new Map<string, BlueprintRule[]>();
        for (const [key, set] of map.entries()) {
            const list = Array.from(set);
            list.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
            result.set(key, list);
        }
        return result;
    };

    return {
        byResourceId: sortByPriority(byResourceId),
        bySchedulePhase: sortByPriority(bySchedulePhase),
    };
}


function filterRulesByMode(rules: BlueprintRule[], mode: RuntimeMode, edgeName?: string): BlueprintRule[] {
    return rules.filter(rule => {
        const target = rule.executionTarget;
        if (mode === "edge") {
            if (target === "master" || !target) return false;
            // target is an edge name — include only if it matches this edge
            return target === edgeName;
        }
        if (mode === "master") return target === "master" || !target;
        return true;
    });
}

function validateRules(rules: BlueprintRule[]): BlueprintRule[] {
    const seen = new Set<string>();
    const out: BlueprintRule[] = [];

    for (const r of rules) {
        if (!r.id) {
            runtimeOutput.log({ level: "warn", component: "RuntimeRulesService", message: `[rule-runtime] Skipping rule with missing id` });
            continue;
        }

        if (seen.has(r.id)) {
            runtimeOutput.log({ level: "error", component: "RuntimeRulesService", message: `[rule-runtime] Duplicate rule id "${r.id}" (skipping subsequent occurrence)` });
            continue;
        }

        if (!r.triggers?.length) {
            runtimeOutput.log({ level: "warn", component: "RuntimeRulesService", message: `[rule-runtime] Rule "${r.id}" has no triggers (it will never run)` });
        }

        seen.add(r.id);
        out.push(r);
    }

    return out;
}
function serializeTrigger(t: RuleTrigger): RuntimeRuleTriggerInfo {
    if (isScheduleTrigger(t)) {
        return { kind: "schedule", phaseId: t.phase?.id ?? "unknown", scheduleId: t.phase?.scheduleId ?? "unknown" };
    }
    const resourceId = t.resource?.id ?? "unknown";
    switch (t.kind) {
        case "resource":
            return { kind: "resource", resourceId, event: t.event, ...(t.hysteresis !== undefined && { hysteresis: t.hysteresis }) };
        case "threshold":
            return { kind: "threshold", resourceId, direction: t.direction, threshold: t.threshold, ...(t.hysteresis !== undefined && { hysteresis: t.hysteresis }) };
        case "tap":
            return { kind: "tap", resourceId };
        case "longPress":
            return { kind: "longPress", resourceId, thresholdMs: t.thresholdMs };
        case "timer":
            return { kind: "timer", resourceId, event: t.event };
        case "action":
            return { kind: "action", resourceId, action: t.action };
    }
}

function serializeRule(rule: BlueprintRule): RuntimeRuleInfo {
    return {
        id: rule.id,
        ...(rule.name != null && { name: rule.name }),
        ...(rule.description != null && { description: rule.description }),
        ...(rule.executionTarget != null && { executionTarget: rule.executionTarget }),
        triggers: rule.triggers.map(serializeTrigger),
        ...(rule.priority != null && { priority: rule.priority }),
        ...(rule.suppressMs != null && { suppressMs: rule.suppressMs }),
        ...(rule.cooldownMs != null && { cooldownMs: rule.cooldownMs }),
        ...(rule.actionHints?.length && { actionHintResourceIds: rule.actionHints.map(r => r.id).filter((id): id is string => id != null) }),
    };
}

/**
 * Loads, validates, filters, and indexes blueprint rules from compiled JS files.
 * Filters rules by runtime mode (edge rules only on matching edge, master rules on master).
 * Indexes rules by trigger resource ID for fast lookup when the rule engine
 * receives a trigger event. Serializes rules to RuntimeRuleInfo for IPC/UI.
 */
export class RuntimeRulesService {
    private rules: BlueprintRule[];
    private readonly allValidatedRules: BlueprintRule[];
    private index: RuleIndex;

    private constructor(rules: BlueprintRule[], allValidatedRules: BlueprintRule[], index: RuleIndex) {
        this.rules = rules;
        this.allValidatedRules = allValidatedRules;
        this.index = index;
    }

    static async create(rulesDir: string, mode: RuntimeMode, edgeName?: string): Promise<RuntimeRulesService> {
        const loaded = await collectRules(rulesDir);
        const validated = validateRules(loaded);
        const rules = filterRulesByMode(validated, mode, edgeName);
        const modeLabel = edgeName ? `${mode} (${edgeName})` : mode;
        runtimeOutput.log({
            level: "info", component: "RuntimeRulesService",
            message: `Loaded ${rules.length} of ${validated.length} rules for mode "${modeLabel}".`,
        });
        const index = indexRules(rules);
        runtimeOutput.log({
            level: "info", component: "RuntimeRulesService",
            message: `Indexed rules for ${index.byResourceId.size} resource ID(s), ${index.bySchedulePhase.size} schedule ID(s).`,
        });
        return new RuntimeRulesService(rules, validated, index);
    }

    /** Reduce to a subset of rules by ID. Used by dev-filter to restrict which rules are active during development. */
    filterByIds(ids: Set<string>): void {
        this.rules = this.rules.filter(r => ids.has(r.id));
        this.index = indexRules(this.rules);
    }

    list(): BlueprintRule[] {
        return this.rules;
    }

    getRulesForResource(resourceId: string): BlueprintRule[] {
        return this.index.byResourceId.get(resourceId) ?? [];
    }

    getRulesForPhase(schedulePhaseId: string): BlueprintRule[] {
        return this.index.bySchedulePhase.get(schedulePhaseId) ?? [];
    }

    serializeRules(): RuntimeRuleInfo[] {
        return this.rules.map(serializeRule);
    }

    serializeAllRules(): RuntimeRuleInfo[] {
        return this.allValidatedRules.map(serializeRule);
    }
}