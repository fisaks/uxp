import { ActionSideEffect, DisplayIcon, DisplayValue, InteractionView, ViewCommand, ViewStateDisplay } from "@uhn/blueprint";
import { humanizeViewId, RuntimeActionSideEffect, RuntimeDisplayIcon, RuntimeDisplayValue, RuntimeInteractionView, RuntimeViewCommand, RuntimeViewStateDisplay } from "@uhn/common";
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

/** Serialize a single ViewCommand → RuntimeViewCommand */
function serializeCommand(cmd: ViewCommand): RuntimeViewCommand {
    return {
        resourceId: cmd.resource.id!,
        type: cmd.type,
        ...("holdMs" in cmd && cmd.holdMs != null && { holdMs: cmd.holdMs }),
        ...("simulateHold" in cmd && cmd.simulateHold != null && { simulateHold: cmd.simulateHold }),
        ...("min" in cmd && cmd.min != null && { min: cmd.min }),
        ...("max" in cmd && cmd.max != null && { max: cmd.max }),
        ...("step" in cmd && cmd.step != null && { step: cmd.step }),
        ...("unit" in cmd && cmd.unit != null && { unit: cmd.unit }),
        ...("defaultOnValue" in cmd && cmd.defaultOnValue != null && { defaultOnValue: cmd.defaultOnValue }),
        ...("options" in cmd && cmd.options && cmd.options.length > 0 && { options: cmd.options.map((o: { value: number; label: string }) => ({ value: o.value, label: o.label })) }),
        ...("action" in cmd && cmd.action != null && { action: cmd.action }),
        ...("metadata" in cmd && cmd.metadata != null && { metadata: cmd.metadata }),
        ...(cmd.onDeactivate && {
            onDeactivate: {
                resourceId: cmd.onDeactivate.resource.id!,
                type: cmd.onDeactivate.type,
                ...("holdMs" in cmd.onDeactivate && cmd.onDeactivate.holdMs != null && { holdMs: cmd.onDeactivate.holdMs }),
                ...("min" in cmd.onDeactivate && cmd.onDeactivate.min != null && { min: cmd.onDeactivate.min }),
                ...("max" in cmd.onDeactivate && cmd.onDeactivate.max != null && { max: cmd.onDeactivate.max }),
                ...("step" in cmd.onDeactivate && cmd.onDeactivate.step != null && { step: cmd.onDeactivate.step }),
                ...("unit" in cmd.onDeactivate && cmd.onDeactivate.unit != null && { unit: cmd.onDeactivate.unit }),
                ...("defaultOnValue" in cmd.onDeactivate && cmd.onDeactivate.defaultOnValue != null && { defaultOnValue: cmd.onDeactivate.defaultOnValue }),
                ...("options" in cmd.onDeactivate && cmd.onDeactivate.options && cmd.onDeactivate.options.length > 0 && { options: cmd.onDeactivate.options.map((o: { value: number; label: string }) => ({ value: o.value, label: o.label })) }),
                ...("action" in cmd.onDeactivate && cmd.onDeactivate.action != null && { action: cmd.onDeactivate.action }),
                ...("metadata" in cmd.onDeactivate && cmd.onDeactivate.metadata != null && { metadata: cmd.onDeactivate.metadata }),
            },
        }),
    };
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
        ...(v.command && { command: serializeCommand(v.command) }),
        ...(v.sideEffects?.length && { sideEffects: v.sideEffects.map(serializeSideEffect) }),
        ...(v.stateDisplay && { stateDisplay: serializeStateDisplay(v.stateDisplay) }),
        ...(v.controls && v.controls.length > 0 && {
            controls: v.controls.map(c => ({
                resourceId: c.resource.id!,
                ...(c.label && { label: c.label }),
                ...(c.group && { group: c.group }),
                ...(c.inline && { inline: true }),
            })),
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
