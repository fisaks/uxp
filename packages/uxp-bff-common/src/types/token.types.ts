import { UserRole } from "@uxp/common";

export type Token = {
    uuid: string;
    roles: UserRole[];
    username: string;
    firstName: string;
    lastName: string;
    email: string;
    sessionId: string;
};
export type RefreshToken = { uuid: string; tokenVersion: number, sessionId: string; };
