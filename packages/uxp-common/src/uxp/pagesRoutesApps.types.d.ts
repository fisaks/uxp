export type AppConfigData = {
    contextPath: string;
    indexPage: string;
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
//# sourceMappingURL=pagesRoutesApps.types.d.ts.map