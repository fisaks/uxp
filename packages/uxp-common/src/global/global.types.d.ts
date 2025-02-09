export type GlobalConfigData = {
    siteName: string;
};
export type LatestGlobalConfigResponse = {
    version: number;
    updatedAt: string;
    config: GlobalConfigData;
};
export type PatchGlobalConfigResponse = LatestGlobalConfigResponse;
export type GlobalConfigPayload = {
    key: keyof GlobalConfigData;
    value: string | boolean | number;
    currentVersion: number;
};
//# sourceMappingURL=global.types.d.ts.map