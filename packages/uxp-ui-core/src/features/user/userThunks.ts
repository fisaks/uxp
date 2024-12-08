import {
    LoginPayload,
    LoginResponse,
    ProfilePayload,
    RegisterPayload,
    RegisterResponse,
    UnlockUserPayload,
    WhoAmIResponse,
} from "@uxp/common";
import axiosInstance from "../../app/axiosInstance";
import { createLoadingAwareThunk } from "../loading/loadingThunk";

export const register = createLoadingAwareThunk(
    "user/register",
    async (payload: RegisterPayload, { rejectWithValue, dispatch }) => {
        const response = await axiosInstance.post<RegisterResponse>("/register", payload);
        return response.data;
    }
);

export const login = createLoadingAwareThunk("user/login", async (payload: LoginPayload, { rejectWithValue }) => {
    const response = await axiosInstance.post<LoginResponse>("/login", payload);
    return response.data as LoginResponse;
});

export const whoami = createLoadingAwareThunk("user/whoami", async (_, { rejectWithValue }) => {
    const response = await axiosInstance.get<WhoAmIResponse>("/whoami");
    return response.data;
});

export const logout = createLoadingAwareThunk("user/logout", async (_, { rejectWithValue }) => {
    const response = await axiosInstance.post<void>("/logout");
    return response.data;
});

export const unlockUser = createLoadingAwareThunk(
    "user/unlock",
    async (payload: UnlockUserPayload, { rejectWithValue }) => {
        await axiosInstance.post<void>("/unlock", payload);
        return;
    }
);

type UpdateProfileArg = {
    uuid: string;
    payload: ProfilePayload;
};
export const updateProfile = createLoadingAwareThunk(
    "user/profile",
    async ({ uuid, payload }: UpdateProfileArg, { rejectWithValue, dispatch }) => {
        const response = await axiosInstance.put(`/profile/${uuid}`, payload);
        return response.data;
    }
);
