import { PageConfigData, PageMetaData, RouteConfigData } from "../uxp/pagesRoutesApps.types";
export type NavigationResponse = {
    routes: NavigationRoute[];
    tags: NavigationTags;
};
export type NavigationRoute = {
    routePattern: string;
    localizedRoutePattern?: Record<string, string>;
    link?: string;
    localizedLink?: Record<string, string>;
    identifier: string;
    config?: RouteConfigData;
    page?: {
        uuid: string;
        identifier: string;
        name: string;
        localizedName?: Record<string, string>;
        metadata?: PageMetaData;
        config: PageConfigData;
        localizedMetadata?: Record<string, PageMetaData>;
        contents: {
            uuid: string;
            internalComponent?: string;
        }[];
    };
};
export type NavigationTags = Record<string, string[]>;
//# sourceMappingURL=navigation.types.d.ts.map