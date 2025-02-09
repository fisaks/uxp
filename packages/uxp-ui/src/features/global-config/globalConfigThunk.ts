import { GlobalConfigPayload, LatestGlobalConfigResponse, PatchGlobalConfigResponse } from "@uxp/common";
import axiosInstance from "../../app/axiosInstance";
import { RootState } from "../../app/store";
import { createLoadingAwareThunk } from "../loading/loadingThunk";

export const fetchLatestGlobalSettings = createLoadingAwareThunk("globalSettings/fetchLatest", async () => {
    const response = await axiosInstance.get<LatestGlobalConfigResponse>("/global-settings/latest");
    return response.data;
});

export type PatchGlobalSettingPayload = Omit<GlobalConfigPayload, "currentVersion">;
export const patchGlobalSetting = createLoadingAwareThunk(
    "globalSettings/patch",
    async ({ key, value }: PatchGlobalSettingPayload, { getState }) => {
        const state = getState() as RootState;
        const currentVersion = state.globalConfig.version;
        const response = await axiosInstance.patch<PatchGlobalConfigResponse>("/global-settings", {
            key,
            value,
            currentVersion,
        });
        return response.data;
    },
    undefined,
    true
);
