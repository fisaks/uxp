import { ActionSideEffect, DisplayIcon, DisplayValue, InteractionView, ViewCommand, ViewStateDisplay } from "@uhn/blueprint";
import { humanizeViewId, RuntimeActionSideEffect, RuntimeDisplayIcon, RuntimeDisplayValue, RuntimeInteractionView, RuntimeViewCommand, RuntimeViewCommandTarget, RuntimeViewStateDisplay } from "@uhn/common";
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

function serializeDisplayValue(item: DisplayValue): RuntimeDisplayValue {
    return {
        resourceId: item.resource.id!,
        label: item.label,
        icon: item.icon,
        unit: item.unit,
    };
}

function serializeDisplayIcon(item: DisplayIcon): RuntimeDisplayIcon {
    return {
        resourceId: item.resource.id!,
        icon: item.icon,
        tooltip: item.tooltip,
        showWhen: item.showWhen,
        colorMap: item.colorMap,
        iconMap: item.iconMap,
    };
}

function serializeStateDisplay(sd: ViewStateDisplay): RuntimeViewStateDisplay {
    return {
        topLeft: sd.topLeft?.map(serializeDisplayIcon),
        topCenter: sd.topCenter?.map(serializeDisplayIcon),
        topRight: sd.topRight?.map(serializeDisplayIcon),
        left: sd.left?.map(serializeDisplayValue),
        right: sd.right?.map(serializeDisplayValue),
        badge: sd.badge?.map(serializeDisplayIcon),
        hero: sd.hero?.map(serializeDisplayValue),
        heroSize: sd.heroSize,
    };
}

function serializeSideEffect(se: ActionSideEffect): RuntimeActionSideEffect {
    return {
        resourceId: se.resource.id!,
        action: se.action,
        ...(se.metadata && { metadata: se.metadata }),
    };
}

/** Serialize a ViewCommandTarget → RuntimeViewCommandTarget (shared by command and onDeactivate) */
function serializeCommandTarget(target: ViewCommand): RuntimeViewCommandTarget {
    const t = target as any;
    return {
        resourceId: target.resource.id!,
        type: target.type,
        holdMs: t.holdMs,
        simulateHold: t.simulateHold,
        min: t.min,
        max: t.max,
        step: t.step,
        unit: t.unit,
        defaultOnValue: t.defaultOnValue,
        options: t.options?.map((o: { value: number; label: string }) => ({ value: o.value, label: o.label })),
        action: t.action,
        metadata: t.metadata,
    };
}

/** Serialize a single ViewCommand → RuntimeViewCommand */
function serializeCommand(cmd: ViewCommand): RuntimeViewCommand {
    return {
        ...serializeCommandTarget(cmd),
        ...(cmd.onDeactivate && { onDeactivate: serializeCommandTarget(cmd.onDeactivate as ViewCommand) }),
    };
}

/** Serialize a single InteractionView → RuntimeInteractionView (resource objects → string IDs) */
function serializeView(v: InteractionView): RuntimeInteractionView {
    return {
        id: v.id!,  // ID injected by normalizeBlueprint
        name: v.name ?? humanizeViewId(v.id!),
        nameMap: v.nameMap ? {
            active: v.nameMap.active,
            inactive: v.nameMap.inactive,
            resources: v.nameMap.resources?.map(r => ({ resourceId: r.resource.id!, name: r.name })),
        } : undefined,
        description: v.description,
        keywords: v.keywords,
        icon: v.icon,
        stateFrom: v.stateFrom.map(s => ({
            resourceId: s.resource.id!,
            activeWhen: s.activeWhen,
        })),
        stateAggregation: v.stateAggregation,
        activeWhen: v.activeWhen,
        command: v.command ? serializeCommand(v.command) : undefined,
        sideEffects: v.sideEffects?.map(serializeSideEffect),
        stateDisplay: v.stateDisplay ? serializeStateDisplay(v.stateDisplay) : undefined,
        controls: v.controls?.map(c => ({
            resourceId: c.resource.id!,
            label: c.label,
            group: c.group,
            inline: c.inline,
        })),
        alwaysEnableControls: v.alwaysEnableControls,
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

/**
 * Loads and serializes blueprint InteractionViews from compiled JS files.
 * Converts resource objects to string IDs (RuntimeInteractionView) for IPC
 * transport to the master/UI. Handles command arrays and per-type command
 * property serialization (holdMs, min/max, action/metadata, etc.).
 */
export class RuntimeViewService {
    private views: RuntimeInteractionView[];

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

    filterByIds(ids: Set<string>): void {
        this.views = this.views.filter(v => ids.has(v.id));
    }

    list(): RuntimeInteractionView[] {
        return this.views;
    }
}
