import { PageConfigData, RouteConfigData } from "../uxp/pagesRoutesApps.types";

export type NavigationResponse = {
    routes: NavigationRoute[];
    tags: NavigationTags;
    system: SystemAppMeta[];
};
export type NavigationRoute = {
    routePattern: string;
    link?: string;
    identifier: string;
    config?: RouteConfigData;
    page?: {
        identifier: string;
        name: string;
        config: PageConfigData;
        contents: {
            uuid: string;
            internalComponent?: string;
        }[];
    };
};

export type NavigationTags = Record<string, string[]>;

export type SystemAppMeta = {
    appId: string;
    appName: string;
    capabilities: {
        health: boolean;
        systemPanel: boolean;
    };
};
