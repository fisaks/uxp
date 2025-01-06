import { UserSearchRequest, UserSearchResponse } from "@uxp/common";
import axiosInstance from "../../app/axiosInstance";
import { createLoadingAwareThunk } from "../loading/loadingThunk";

export const searchUsers = createLoadingAwareThunk("user/search", async (request: UserSearchRequest) => {
    const response = await axiosInstance.post<UserSearchResponse>("/user/search", request);
    return response.data;
});
