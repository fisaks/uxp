// services/runtime-rules.service.ts
import { BlueprintRule, isBlueprintRule } from "@uhn/blueprint";
import fs from "fs-extra";
import path from "path";
import { stdoutWriter } from "../io/stdout-writer";


type TriggerIndex = {
    byResourceId: Map<string, BlueprintRule[]>;
    timers: BlueprintRule[];
};

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

function indexRules(rules: BlueprintRule[]): TriggerIndex {
    const byResourceId = new Map<string, Set<BlueprintRule>>();
    const timers = new Set<BlueprintRule>();

    for (const rule of rules) {
        for (const t of rule.triggers) {
            if (t.type === "timer") {
                timers.add(rule);
                continue;
            }

            const resourceId = t.resource?.id;
            if (!resourceId) {
                stdoutWriter.log({
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

            set.add(rule); // ← dedupe guaranteed
        }
    }

    // Convert Sets → sorted arrays
    const byResourceIdFinal = new Map<string, BlueprintRule[]>();
    for (const [resourceId, set] of byResourceId.entries()) {
        const list = Array.from(set);
        list.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
        byResourceIdFinal.set(resourceId, list);
    }

    const timersFinal = Array.from(timers).sort(
        (a, b) => (b.priority ?? 0) - (a.priority ?? 0)
    );

    return {
        byResourceId: byResourceIdFinal,
        timers: timersFinal,
    };
}


function validateRules(rules: BlueprintRule[]): BlueprintRule[] {
    const seen = new Set<string>();
    const out: BlueprintRule[] = [];

    for (const r of rules) {
        if (!r.id) {
            stdoutWriter.log({ level: "warn", component: "RuntimeRulesService", message: `[rule-runtime] Skipping rule with missing id` });
            continue;
        }

        if (seen.has(r.id)) {
            stdoutWriter.log({ level: "error", component: "RuntimeRulesService", message: `[rule-runtime] Duplicate rule id "${r.id}" (skipping subsequent occurrence)` });
            continue;
        }

        if (!r.triggers?.length) {
            stdoutWriter.log({ level: "warn", component: "RuntimeRulesService", message: `[rule-runtime] Rule "${r.id}" has no triggers (it will never run)` });
        }

        seen.add(r.id);
        out.push(r);
    }

    return out;
}
export class RuntimeRulesService {
    private readonly rules: BlueprintRule[];
    private readonly index: TriggerIndex;

    private constructor(rules: BlueprintRule[], index: TriggerIndex) {
        this.rules = rules;
        this.index = index;
    }

    static async create(rulesDir: string): Promise<RuntimeRulesService> {
        const loaded = await collectRules(rulesDir);
        const rules = validateRules(loaded);
        const index = indexRules(rules);
        stdoutWriter.log({ level: "info", component: "RuntimeRulesService", message: `Loaded ${rules.length} rules.` });
        return new RuntimeRulesService(rules, index);
    }

    list(): BlueprintRule[] {
        return this.rules;
    }

    getRulesForResource(resourceId: string): BlueprintRule[] {
        return this.index.byResourceId.get(resourceId) ?? [];
    }

    listTimerRules(): BlueprintRule[] {
        return this.index.timers;
    }
}