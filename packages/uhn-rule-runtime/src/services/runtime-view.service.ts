import { InteractionView, StateDisplayItem } from "@uhn/blueprint";
import { humanizeViewId, RuntimeInteractionView, RuntimeStateDisplayItem } from "@uhn/common";
import fs from "fs-extra";
import path from "path";
import { runtimeOutput } from "../io/runtime-output";

/** Type guard for view objects produced by the view() factory */
function isInteractionViewObject(obj: unknown): obj is InteractionView {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "id" in obj &&
        typeof (obj as any).id === "string" &&
        "stateFrom" in obj &&
        Array.isArray((obj as any).stateFrom)
    );
}

function serializeStateDisplayItem(item: StateDisplayItem): RuntimeStateDisplayItem {
    const base = {
        resourceId: item.resource.id!,
        ...(item.label && { label: item.label }),
        ...(item.unit && { unit: item.unit }),
    };
    if (item.style === "indicator" || item.style === "flash") {
        return { ...base, style: item.style, icon: item.icon };
    }
    return { ...base, ...(item.style && { style: item.style }) };
}

/** Serialize a single InteractionView → RuntimeInteractionView (resource objects → string IDs) */
function serializeView(v: InteractionView): RuntimeInteractionView {
    return {
        id: v.id!,  // ID injected by normalizeBlueprint
        name: v.name ?? humanizeViewId(v.id!),
        description: v.description,
        keywords: v.keywords,
        icon: v.icon,
        stateFrom: v.stateFrom.map(s => ({
            resourceId: s.resource.id!,
            ...(s.activeWhen && { activeWhen: s.activeWhen }),
        })),
        ...(v.stateAggregation && { stateAggregation: v.stateAggregation }),
        ...(v.activeWhen && { activeWhen: v.activeWhen }),
        ...(v.command && {
            command: {
                resourceId: v.command.resource.id!,
                type: v.command.type,
                ...("holdMs" in v.command && v.command.holdMs != null && { holdMs: v.command.holdMs }),
                ...("min" in v.command && v.command.min != null && { min: v.command.min }),
                ...("max" in v.command && v.command.max != null && { max: v.command.max }),
                ...("step" in v.command && v.command.step != null && { step: v.command.step }),
                ...("unit" in v.command && v.command.unit != null && { unit: v.command.unit }),
                ...("defaultOnValue" in v.command && v.command.defaultOnValue != null && { defaultOnValue: v.command.defaultOnValue }),
                ...(v.command.onDeactivate && {
                    onDeactivate: {
                        resourceId: v.command.onDeactivate.resource.id!,
                        type: v.command.onDeactivate.type,
                        ...("holdMs" in v.command.onDeactivate && v.command.onDeactivate.holdMs != null && { holdMs: v.command.onDeactivate.holdMs }),
                        ...("min" in v.command.onDeactivate && v.command.onDeactivate.min != null && { min: v.command.onDeactivate.min }),
                        ...("max" in v.command.onDeactivate && v.command.onDeactivate.max != null && { max: v.command.onDeactivate.max }),
                        ...("step" in v.command.onDeactivate && v.command.onDeactivate.step != null && { step: v.command.onDeactivate.step }),
                        ...("unit" in v.command.onDeactivate && v.command.onDeactivate.unit != null && { unit: v.command.onDeactivate.unit }),
                        ...("defaultOnValue" in v.command.onDeactivate && v.command.onDeactivate.defaultOnValue != null && { defaultOnValue: v.command.onDeactivate.defaultOnValue }),
                    },
                }),
            },
        }),
        ...(v.stateDisplay && {
            stateDisplay: {
                items: v.stateDisplay.items.map(serializeStateDisplayItem),
                ...(v.stateDisplay.aggregation && { aggregation: v.stateDisplay.aggregation }),
            },
        }),
    };
}

async function collectViews(viewsDir: string): Promise<RuntimeInteractionView[]> {
    if (!(await fs.pathExists(viewsDir))) {
        // views/ is optional — return empty without error
        return [];
    }
    const views: RuntimeInteractionView[] = [];

    async function walk(dir: string) {
        const entries = await fs.readdir(dir);
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) { await walk(fullPath); continue; }
            if (!stat.isFile() || !entry.endsWith(".js")) continue;

            const mod = require(fullPath);
            for (const [exportName, obj] of Object.entries(mod)) {
                if (isInteractionViewObject(obj)) {
                    views.push(serializeView(obj));
                } else {
                    runtimeOutput.log({
                        level: "warn",
                        component: "RuntimeViewService",
                        message: `Skipped non-view export "${exportName}" in "${fullPath}"`,
                    });
                }
            }
        }
    }
    await walk(viewsDir);
    return views;
}

export class RuntimeViewService {
    private readonly views: RuntimeInteractionView[];

    private constructor(views: RuntimeInteractionView[]) {
        this.views = views;
    }

    static async create(viewsDir: string): Promise<RuntimeViewService> {
        const views = await collectViews(viewsDir);
        runtimeOutput.log({
            level: "info",
            component: "RuntimeViewService",
            message: `Loaded ${views.length} view(s).`,
        });
        return new RuntimeViewService(views);
    }

    list(): RuntimeInteractionView[] {
        return this.views;
    }
}
