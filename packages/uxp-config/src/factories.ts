import { AccessType, AppConfigData, PageConfigData, UserRole } from "@uxp/common";
import { GlobalConfigDefaults, RouteConfig } from "./types";

export function tag<const T extends {
    name: string;
}>(opts: T): T {
    return opts;
}

export function app<const T extends {
    name: string; baseUrl: string; isActive?: boolean; config: AppConfigData;
}>(opts: T): T {
    return opts;
}

export function page<const T extends {
    identifier: string; name: string; config?: PageConfigData;
}>(opts: T): T {
    return opts;
}

export function pageApp<const T extends {
    page: string; app?: string; internalComponent?: string;
    order: number; roles?: readonly UserRole[];
    config?: Record<string, unknown>;
}>(opts: T): T {
    return opts;
}

export function route<const T extends {
    identifier: string; routePattern: string; link?: string;
    page?: string; accessType: AccessType; roles?: readonly UserRole[];
    config?: RouteConfig<string>["config"];
}>(opts: T): T {
    return opts;
}

export function routeTag<const T extends {
    route: string; tag: string; routeOrder?: number;
}>(opts: T): T {
    return opts;
}

export function globalConfig(opts: GlobalConfigDefaults): GlobalConfigDefaults {
    return opts;
}
