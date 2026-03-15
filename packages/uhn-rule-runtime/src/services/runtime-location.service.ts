import type { BlueprintLocation, LocationItem } from "@uhn/blueprint";
import { humanizeLocationId, humanizeResourceId, humanizeSceneId, humanizeViewId, RuntimeLocation, RuntimeLocationItem } from "@uhn/common";
import fs from "fs-extra";
import path from "path";
import { runtimeOutput } from "../io/runtime-output";

/** Type guard for location objects produced by the location() factory */
function isLocationObject(obj: unknown): obj is BlueprintLocation {
    return (
        typeof obj === "object" &&
        obj !== null &&
        "id" in obj &&
        typeof (obj as any).id === "string" &&
        "items" in obj &&
        Array.isArray((obj as any).items)
    );
}

/**
 * Strip the location name as a prefix from an item's display name.
 * Case-insensitive. Trims leading/trailing whitespace after stripping.
 *
 * "Kitchen Ceiling Light" + location "Kitchen" → "Ceiling Light"
 * "Ceiling Light" + location "Kitchen" → "Ceiling Light" (no match, unchanged)
 */
function stripLocationPrefix(itemName: string, locationName: string): string {
    const lower = itemName.toLowerCase();
    const prefix = locationName.toLowerCase();
    if (lower.startsWith(prefix)) {
        const stripped = itemName.slice(prefix.length).trim();
        if (stripped.length > 0) {
            // Capitalize first letter
            return stripped.charAt(0).toUpperCase() + stripped.slice(1);
        }
    }
    return itemName;
}

/** Resolve the display name for a location item:
 *  1. Explicit item.name override (set in location() call)
 *  2. ref.name (the resource/view's own name from blueprint)
 *  3. Humanized ref.id with location name prefix stripped */
function resolveItemName(
    item: LocationItem,
    locationName: string,
): string | undefined {
    // Explicit override always wins
    if (item.name) return item.name;

    // Use the ref's own name, strip location prefix
    if (item.ref.name) return stripLocationPrefix(item.ref.name, locationName);

    // Fallback: humanize the ref ID, then strip location prefix
    const refId = item.ref.id;
    if (!refId) return undefined;

    const humanized = item.kind === "view"
        ? humanizeViewId(refId)
        : item.kind === "scene"
        ? humanizeSceneId(refId)
        : humanizeResourceId(refId);

    return stripLocationPrefix(humanized, locationName);
}

/** Serialize a single BlueprintLocation → RuntimeLocation */
function serializeLocation(loc: BlueprintLocation): RuntimeLocation {
    const locationName = loc.name ?? humanizeLocationId(loc.id!);

    return {
        id: loc.id!,
        name: locationName,
        description: loc.description,
        keywords: loc.keywords,
        icon: loc.icon,
        items: loc.items.map((item): RuntimeLocationItem => {
            const name = resolveItemName(item, locationName);
            return {
                kind: item.kind,
                refId: item.ref.id!,
                ...(name != null && { name }),
            };
        }),
    };
}

async function collectLocations(locationsDir: string): Promise<RuntimeLocation[]> {
    if (!(await fs.pathExists(locationsDir))) {
        // locations/ is optional — return empty without error
        return [];
    }
    const locations: RuntimeLocation[] = [];

    async function walk(dir: string) {
        const entries = await fs.readdir(dir);
        for (const entry of entries) {
            const fullPath = path.join(dir, entry);
            const stat = await fs.stat(fullPath);
            if (stat.isDirectory()) { await walk(fullPath); continue; }
            if (!stat.isFile() || !entry.endsWith(".js")) continue;

            const mod = require(fullPath);
            for (const [exportName, obj] of Object.entries(mod)) {
                if (isLocationObject(obj)) {
                    locations.push(serializeLocation(obj));
                } else {
                    runtimeOutput.log({
                        level: "warn",
                        component: "RuntimeLocationService",
                        message: `Skipped non-location export "${exportName}" in "${fullPath}"`,
                    });
                }
            }
        }
    }
    await walk(locationsDir);
    return locations;
}

export class RuntimeLocationService {
    private readonly locations: RuntimeLocation[];

    private constructor(locations: RuntimeLocation[]) {
        this.locations = locations;
    }

    static async create(locationsDir: string): Promise<RuntimeLocationService> {
        const locations = await collectLocations(locationsDir);
        runtimeOutput.log({
            level: "info",
            component: "RuntimeLocationService",
            message: `Loaded ${locations.length} location(s).`,
        });
        return new RuntimeLocationService(locations);
    }

    list(): RuntimeLocation[] {
        return this.locations;
    }
}
