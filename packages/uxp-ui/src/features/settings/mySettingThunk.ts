import { UserSettingsPayload, UserSettingsResponse } from "@uxp/common";
import axiosInstance from "../../app/axiosInstance";
import { createLoadingAwareThunk } from "../loading/loadingThunk";

export const fetchMySettings = createLoadingAwareThunk("mysettings/fetch", async (_, ) => {
    const response = await axiosInstance.get<UserSettingsResponse>("/my-settings");
    return response.data;
});

export const updateMySettings = createLoadingAwareThunk("mysettings/update", async (payload: UserSettingsPayload, ) => {
    const response = await axiosInstance.put<UserSettingsResponse>("/my-settings", payload);
    return response.data;
});
