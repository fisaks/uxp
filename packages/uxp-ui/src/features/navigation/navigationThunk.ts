import { NavigationResponse } from "@uxp/common";
import axiosInstance from "../../app/axiosInstance";
import { createLoadingAwareThunk } from "../loading/loadingThunk";

export const fetchNavigation = createLoadingAwareThunk("navigation/fetch", async (_, ) => {
    const response = await axiosInstance.get<NavigationResponse>("/navigation");
    return response.data;
});
