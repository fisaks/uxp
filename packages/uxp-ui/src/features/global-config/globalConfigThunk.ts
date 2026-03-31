import { GlobalConfigPayload, FullGlobalConfigResponse, PublicGlobalConfigResponse } from "@uxp/common";
import axiosInstance from "../../app/axiosInstance";
import { createLoadingAwareThunk } from "../loading/loadingThunk";

/** Public fetch — unauthenticated, returns only siteName */
export const fetchPublicGlobalSettings = createLoadingAwareThunk("globalSettings/fetchPublic", async () => {
    const response = await axiosInstance.get<PublicGlobalConfigResponse>("/global-settings/public");
    return response.data;
});

/** Admin fetch — returns full config (notification, healthChecks, etc.) */
export const fetchFullGlobalSettings = createLoadingAwareThunk("globalSettings/fetchFull", async () => {
    const response = await axiosInstance.get<FullGlobalConfigResponse>("/global-settings/full");
    return response.data;
});

export const patchGlobalSetting = createLoadingAwareThunk(
    "globalSettings/patch",
    async ({ key, value }: GlobalConfigPayload) => {
        await axiosInstance.patch("/global-settings", { key, value });
    },
    undefined,
    true
);
