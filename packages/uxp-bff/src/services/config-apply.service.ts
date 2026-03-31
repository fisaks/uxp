import { AppLogger, getRequestContext } from "@uxp/bff-common";
import { SerializablePlatformConfig } from "@uxp/config";
import { v5 as uuidv5 } from "uuid";
import { AppEntity } from "../db/entities/AppEntity";
import { GlobalConfigEntity } from "../db/entities/GlobalConfigEntity";
import { PageAppsEntity } from "../db/entities/PageAppsEntity";
import { PageEntity } from "../db/entities/PageEntity";
import { RouteEntity } from "../db/entities/RouteEntity";
import { RouteTagsEntity } from "../db/entities/RouteTagsEntity";
import { TagEntity } from "../db/entities/TagEntity";

const UXP_CONFIG_NAMESPACE = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

function pageAppUuid(page: string, appOrComponent: string, order: number): string {
    return uuidv5(`${page}:${appOrComponent}:${order}`, UXP_CONFIG_NAMESPACE);
}

function validateConfig(config: SerializablePlatformConfig): void {
    const errors: string[] = [];

    const pageIds = new Set(config.pages.map((p) => p.identifier));
    const appNames = new Set(config.apps.map((a) => a.name));
    const routeIds = new Set(config.routes.map((r) => r.identifier));
    const tagNames = new Set(config.tags.map((t) => t.name));

    // Check for duplicate identifiers
    if (pageIds.size !== config.pages.length) errors.push("Duplicate page identifiers");
    if (appNames.size !== config.apps.length) errors.push("Duplicate app names");
    if (routeIds.size !== config.routes.length) errors.push("Duplicate route identifiers");
    if (tagNames.size !== config.tags.length) errors.push("Duplicate tag names");

    // Validate cross-references
    for (const pa of config.pageApps) {
        if (!pageIds.has(pa.page)) errors.push(`pageApps: page "${pa.page}" not found`);
        if (pa.app && !appNames.has(pa.app)) errors.push(`pageApps: app "${pa.app}" not found`);
    }
    for (const r of config.routes) {
        if (r.page && !pageIds.has(r.page)) errors.push(`routes: page "${r.page}" not found`);
    }
    for (const rt of config.routeTags) {
        if (!routeIds.has(rt.route)) errors.push(`routeTags: route "${rt.route}" not found`);
        if (!tagNames.has(rt.tag)) errors.push(`routeTags: tag "${rt.tag}" not found`);
    }

    // Require at least one root route
    const hasRootRoute = config.routes.some((r) => r.routePattern === "/");
    if (!hasRootRoute) errors.push('No route with routePattern "/" found — a root route is required');

    if (errors.length > 0) {
        throw new Error(`Config validation failed:\n  ${errors.join("\n  ")}`);
    }
}

export type ApplyConfigStats = {
    tags: number;
    apps: number;
    pages: number;
    pageApps: number;
    routes: number;
    routeTags: number;
};

async function applyConfig(
    config: SerializablePlatformConfig,
): Promise<ApplyConfigStats> {
    validateConfig(config);

    const { queryRunner } = getRequestContext(true);
    const manager = queryRunner!.manager;

    // Delete in FK order (children first)
    await manager.delete(RouteTagsEntity, {});
    await manager.delete(PageAppsEntity, {});
    await manager.delete(RouteEntity, {});
    await manager.delete(PageEntity, {});
    await manager.delete(AppEntity, {});
    await manager.delete(TagEntity, {});

    // Insert parents (no FK dependencies)
    const savedTags = await manager.save(config.tags.map((t) => new TagEntity({ name: t.name })));
    const tagMap = new Map(savedTags.map((t) => [t.name, t]));

    const savedApps = await manager.save(config.apps.map((a) => new AppEntity({
        name: a.name,
        baseUrl: a.baseUrl,
        isActive: a.isActive ?? true,
        config: a.config,
    })));
    const appMap = new Map(savedApps.map((a) => [a.name, a]));

    const savedPages = await manager.save(config.pages.map((p) => new PageEntity({
        identifier: p.identifier,
        name: p.name,
        config: p.config,
    })));
    const pageMap = new Map(savedPages.map((p) => [p.identifier, p]));

    // Insert children (resolve FKs from maps)
    await manager.save(config.pageApps.map((pa) => new PageAppsEntity({
        uuid: pageAppUuid(pa.page, pa.app ?? pa.internalComponent ?? "", pa.order),
        page: pageMap.get(pa.page)!,
        app: (pa.app ? appMap.get(pa.app)! : undefined) as AppEntity,
        internalComponent: pa.internalComponent as string,
        order: pa.order,
        roles: [...(pa.roles ?? [])],
        config: pa.config as PageAppsEntity["config"],
    })));

    const savedRoutes = await manager.save(config.routes.map((r) => new RouteEntity({
        identifier: r.identifier,
        routePattern: r.routePattern,
        link: r.link as string,
        page: (r.page ? pageMap.get(r.page)! : undefined) as PageEntity,
        config: r.config as RouteEntity["config"],
        accessType: r.accessType,
        roles: [...(r.roles ?? [])],
    })));
    const routeMap = new Map(savedRoutes.map((r) => [r.identifier, r]));

    await manager.save(config.routeTags.map((rt) => new RouteTagsEntity({
        route: routeMap.get(rt.route)!,
        tag: tagMap.get(rt.tag)!,
        routeOrder: rt.routeOrder ?? null,
    })));

    // Handle global config (per-field managed, single-row id=1)
    if (config.globalConfig) {
        const gc = config.globalConfig;
        const globalConfigRepo = manager.getRepository(GlobalConfigEntity);
        const existing = await globalConfigRepo.findOne({ where: { id: 1 } });

        // Build new config: start from existing values (if any), apply managed fields,
        // seed unmanaged fields only if no row exists yet
        const currentConfig: Record<string, unknown> = existing?.config ? JSON.parse(JSON.stringify(existing.config)) : {};

        for (const [key, field] of Object.entries(gc)) {
            const { value, managed } = field as { value: unknown; managed: boolean };
            if (managed || getNestedValue(currentConfig, key) === undefined) {
                setNestedValue(currentConfig, key, value);
            }
        }

        const isDifferent = !existing || JSON.stringify(existing.config) !== JSON.stringify(currentConfig);

        if (isDifferent) {
            if (existing) {
                for (const [key, field] of Object.entries(gc)) {
                    const { value, managed } = field as { value: unknown; managed: boolean };
                    const oldVal = getNestedValue(existing.config as Record<string, unknown>, key);
                    if (oldVal !== value) {
                        AppLogger.info({ message: `globalConfig.${key}: "${oldVal}" → "${value}"${managed ? "" : " (seed)"}` });
                    }
                }
                await globalConfigRepo.update(1, {
                    config: currentConfig as GlobalConfigEntity["config"],
                    updatedBy: "config-apply",
                });
            } else {
                AppLogger.info({ message: "globalConfig: initial seed" });
                await globalConfigRepo.save(new GlobalConfigEntity({
                    config: currentConfig as GlobalConfigEntity["config"],
                    updatedBy: "config-apply",
                }));
            }
        }
    }

    return {
        tags: config.tags.length,
        apps: config.apps.length,
        pages: config.pages.length,
        pageApps: config.pageApps.length,
        routes: config.routes.length,
        routeTags: config.routeTags.length,
    };
}

function setNestedValue(obj: Record<string, unknown>, keyPath: string, value: unknown): void {
    const keys = keyPath.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = obj;
    for (let i = 0; i < keys.length - 1; i++) {
        if (current[keys[i]] === undefined || current[keys[i]] === null) {
            current[keys[i]] = {};
        }
        current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
}

function getNestedValue(obj: Record<string, unknown>, keyPath: string): unknown {
    const keys = keyPath.split(".");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let current: any = obj;
    for (const key of keys) {
        if (current === undefined || current === null) return undefined;
        current = current[key];
    }
    return current;
}

export const ConfigApplyService = {
    applyConfig,
};
