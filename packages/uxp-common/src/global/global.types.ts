export type GlobalConfigData = {
    siteName: string;
    /*"features"?: {
        "darkMode": boolean,
        "multi_language": boolean
    },*/
};

export type LatestGlobalConfigResponse = {
    version: number;
    updatedAt: string;
    config: GlobalConfigData;
};

export type PatchGlobalConfigResponse = LatestGlobalConfigResponse;

export type GlobalConfigPayload = {
    key: keyof GlobalConfigData; //| `features.${keyof GlobalConfigData['features']}`;
    value: string | boolean | number;
    currentVersion: number;
};
