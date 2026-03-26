import {
    TagConfig,
    AppConfig,
    PageConfig,
    PageAppConfig,
    RouteConfig,
    RouteTagConfig,
    GlobalConfigDefaults,
} from "./types";

export function defineConfig<
    const TTags extends readonly TagConfig[],
    const TApps extends readonly AppConfig[],
    const TPages extends readonly PageConfig[],
    const TRoutes extends readonly RouteConfig<TPages[number]["identifier"]>[],
>(config: {
    tags: TTags;
    apps: TApps;
    pages: TPages;
    pageApps: readonly PageAppConfig<TPages[number]["identifier"], TApps[number]["name"]>[];
    routes: TRoutes;
    routeTags: readonly RouteTagConfig<TRoutes[number]["identifier"], TTags[number]["name"]>[];
    globalConfig?: GlobalConfigDefaults;
}) {
    return config;
}
