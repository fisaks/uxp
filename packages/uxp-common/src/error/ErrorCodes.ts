// packages/common/src/errors/ErrorCodes.ts
export const ErrorCodes = {
    INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    VALIDATION: "VALIDATION",
    NOT_FOUND: "NOT_FOUND",
    USERNAME_EXISTS: "USERNAME_EXISTS",
    ALREADY_REGISTERED: "ALREADY_REGISTERED",
    INVALID_USERNAME_PASSWORD: "INVALID_USERNAME_PASSWORD",
    INVALID_REFRESH_TOKEN: "INVALID_REFRESH_TOKEN",
    USER_NOT_FOUND: "USER_NOT_FOUND",
    USER_OLD_PASSWORD_NOT_MATCH: "USER_OLD_PASSWORD_NOT_MATCH",
} as const;

export type ErrorCode = keyof typeof ErrorCodes;
