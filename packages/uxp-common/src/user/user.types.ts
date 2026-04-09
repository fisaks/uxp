import { SearchRequest, SearchResponse } from "../search/search.types";

export type RegisterPayload = {
    username: string;
    password: string;
    passwordConfirm: string;
    firstName: string;
    lastName: string;
    email: string;
};
export type RegisterResponse = {
    uuid: string;
};

export type LoginPayload = Pick<RegisterPayload, "username" | "password">;
export type LoginResponse = {
    user: UserPublic;
};

export type WhoAmIResponse = LoginResponse;
export type UpdateUserRolesResponse = {
    user: UserAdminView;
};

export type UnlockUserPayload = {
    uuid: string;
};
export type UnlockUserReponse = UpdateUserRolesResponse;

export type LockUserPayload = {
    uuid: string;
};
export type LockUserResponse = UpdateUserRolesResponse;

export type UpdateTokenVersionPayload = {
    uuid: string;
};
export type UpdateTokenVersionResponse = UpdateUserRolesResponse;

export type UpdateUserRolesPayload = {
    uuid: string;
    roles: UserRole[];
};
export type UserRole = "admin" | "user";

export type UserPublic = {
    uuid: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: UserRole[];
    createdAt: string;
    lastLogin?: string | null;
};

export type UserAdminView = UserPublic & {
    failedLoginAttempts: number;
    isDisabled: boolean;
    tokenVersion: number;
};
export type ProfilePayload = {
    passwordOld: string;
    password: string;
    passwordConfirm: string;
    firstName: string;
    lastName: string;
    email: string;
};

export type ThemeKeys = "dracula" | "light" | "starWarsDarkSide" | "sunset" | "rebelAlliance" | "tatooine" | "windsOfWinter" | "godzilla" | "wizard" | "witcher";

export type ThemeEffectMode = "full" | "silent";
export type ThemeEffectSettings = {
    autoTrigger: boolean;
    mode: ThemeEffectMode;
    /** Base interval in minutes between auto-triggers (randomized 0.5x–1.5x) */
    frequency: number;
    /** How long an auto-triggered effect plays in seconds. 0 = use default (one cycle) */
    duration: number;
};

export type UserSettingsData = {
    theme?: ThemeKeys;
    themeEffect?: ThemeEffectSettings;
};

export type UserSettingsResponse = UserSettingsData;
export type UserSettingsPayload = UserSettingsData;

export type UserSearchRequest = SearchRequest<UserAdminView>;
export type UserSearchResponse = SearchResponse<UserAdminView[]>;
