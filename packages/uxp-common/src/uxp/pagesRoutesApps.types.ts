export type AppConfigData = {
    contextPath: string;
    wsPath?: string;
    wsPublic?: boolean;
    indexPage: string;
    appOption?: Record<string, string | boolean | number | object>;
};

export type PageAppsConfigData = Partial<AppConfigData> & {};

export type RouteConfigData = {
    redirect?: string;
};

export type PageMetaData<T = string> = Record<string, T>;

export type PageType = "fullWidth" | "leftNavigation";
export type PageConfigData = {
    pageType: PageType;
    routeLinkGroup?: string;
};
export type LocalizedStringValue = Record<string, string>;
