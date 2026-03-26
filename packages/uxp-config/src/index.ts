export { defineConfig } from "./define-config";
export { basePlatformConfig } from "./base-config";
export { tag, app, page, pageApp, route, routeTag, globalConfig } from "./factories";
export type { AccessType, UserRole } from "@uxp/common";
export type {
    WellKnownInternalComponent,
    TagConfig,
    AppConfig,
    PageConfig,
    PageAppConfig,
    RouteConfig,
    RouteTagConfig,
    ManagedField,
    GlobalConfigDefaults,
} from "./types";
export type { SerializablePlatformConfig } from "./serializable";
