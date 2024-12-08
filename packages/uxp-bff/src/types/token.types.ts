import { UserRole } from "@uxp/common";

export type Token = {
    uuid: string;
    roles: UserRole[];
    username: string;
    firstName: string;
    lastName: string;
    email: string;
};
export type RefreshToken = { uuid: string; tokenVersion: number };
