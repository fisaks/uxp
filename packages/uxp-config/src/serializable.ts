import {
    TagConfig,
    AppConfig,
    PageConfig,
    PageAppConfig,
    RouteConfig,
    RouteTagConfig,
    GlobalConfigDefaults,
} from "./types";

export type SerializablePlatformConfig = {
    readonly tags: readonly TagConfig[];
    readonly apps: readonly AppConfig[];
    readonly pages: readonly PageConfig[];
    readonly pageApps: readonly PageAppConfig<string, string>[];
    readonly routes: readonly RouteConfig<string>[];
    readonly routeTags: readonly RouteTagConfig<string, string>[];
    readonly globalConfig?: GlobalConfigDefaults;
};
