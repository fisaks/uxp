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
    user: UserPubllic;
};

export type WhoAmIResponse = LoginResponse;

export type UnlockUserPayload = {
    uuid: string;
};

export type UserRole = "admin" | "user";

export type UserPubllic = {
    uuid: string;
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    roles: UserRole[];
    createdAt: string;
    lastLogin?: string | null;
};

export type ProfilePayload = {
    passwordOld: string;
    password: string;
    passwordConfirm: string;
    firstName: string;
    lastName: string;
    email: string;
};

export type UserSettingsData = {
    theme?: "dracula" | "light";
};

export type UserSettingsResponse = UserSettingsData;
export type UserSettingsPayload = UserSettingsData;
