import {
    LockUserPayload,
    LockUserResponse,
    UnlockUserPayload,
    UnlockUserReponse,
    UpdateTokenVersionPayload,
    UpdateTokenVersionResponse,
    UpdateUserRolesPayload,
    UpdateUserRolesResponse,
    UserSearchRequest,
    UserSearchResponse,
} from "@uxp/common";
import axiosInstance from "../../app/axiosInstance";
import { createLoadingAwareThunk } from "../loading/loadingThunk";

export const searchUsers = createLoadingAwareThunk(
    "user/search",
    async (request: UserSearchRequest) => {
        //await new Promise((resolve) => setTimeout(resolve, 1000));
        const response = await axiosInstance.post<UserSearchResponse>("/user/search", request);
        return response.data;
    },
    undefined,
    true
);

export const lockUser = createLoadingAwareThunk(
    "user/lock",
    async (request: LockUserPayload) => {
        const response = await axiosInstance.post<LockUserResponse>("/user/lock", request);
        return response.data;
    },
    undefined,
    true
);

export const unlockUser = createLoadingAwareThunk(
    "user/unlock",
    async (request: UnlockUserPayload) => {
        //await new Promise((resolve) => setTimeout(resolve, 1000));

        const response = await axiosInstance.post<UnlockUserReponse>("/user/unlock", request);
        return response.data;
    },
    undefined,
    true
);

export const updateUserRoles = createLoadingAwareThunk(
    "user/updateRoles",
    async (request: UpdateUserRolesPayload) => {
        //await new Promise((resolve) => setTimeout(resolve, 1000));

        const response = await axiosInstance.post<UpdateUserRolesResponse>("/user/roles", request);
        return response.data;
    },
    undefined,
    true
);

export const updateUserTokenVersion = createLoadingAwareThunk(
    "user/tokenVersion",
    async (request: UpdateTokenVersionPayload) => {
        //await new Promise((resolve) => setTimeout(resolve, 1000));

        const response = await axiosInstance.post<UpdateTokenVersionResponse>("/user/token-version", request);
        return response.data;
    },
    undefined,
    true
);
