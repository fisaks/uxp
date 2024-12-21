export type AppConfigData = {};

export type PageAppsConfigData = {};

export type RouteConfigData = {
    redirect?: string;
};

export type PageMetaData<T = string> = Record<string, T>;
export type LocalizedStringValue = Record<string, string>;
