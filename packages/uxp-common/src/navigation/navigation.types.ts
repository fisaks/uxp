import { PageMetaData, RouteConfigData } from "../uxp/pagesRoutesApps.types";

export type NavigationResponse = {
    routes: NavigationRoute[];
};
export type NavigationRoute = {
    routePattern: string;
    localizedRoutePattern?: Record<string, string>;
    link?: string;
    localizedLink?: Record<string, string>;
    groupName?: string;
    config?: RouteConfigData;
    page?: {
        uuid: string;
        identifier: string;
        name: string;
        localizedName?: Record<string, string>;
        metadata?: PageMetaData;
        localizedMetadata?: Record<string, PageMetaData>;
        contents: {
            uuid: string;
            internalComponent?: string;
        }[];
    };
};
