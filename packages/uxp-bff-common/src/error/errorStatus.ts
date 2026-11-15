import { ErrorCode } from "@uxp/common";

/**
 * The HTTP status of each error code. The code is what the app throws and the client maps; the status is only how REST
 * answers it, so it lives here at the edge and not at the place an error is thrown. A new code does not compile without one.
 */
const ERROR_STATUS: Record<ErrorCode, number> = {
    // 400: the request is wrong.
    BROWSER_SEND_ERROR: 400,
    VALIDATION: 400,
    USERNAME_EXISTS: 400,
    ALREADY_REGISTERED: 400,
    // 400, not 401: the clients try a token refresh on every 401.
    INVALID_USERNAME_PASSWORD: 400,
    USER_OLD_PASSWORD_NOT_MATCH: 400,
    NO_FILES_UPLOADED: 400,
    ONLY_SINGLE_FILE_ALLOWED: 400,
    INVALID_FILE_TYPE: 400,
    MISSING_BLUEPRINT_JSON: 400,
    BLUEPRINT_JSON_INVALID: 400,
    BLUEPRINT_JSON_VALIDATION_FAILED: 400,
    ACTIVE_BLUEPRINT_DELETE_FORBIDDEN: 400,
    INVALID_RESOURCE_COMMAND: 400,
    INVALID_RESOURCE_TYPE: 400,
    RESOURCE_NOT_ADDRESSABLE: 400,

    // 401: not authenticated.
    UNAUTHORIZED: 401,
    INVALID_REFRESH_TOKEN: 401,
    INVALID_API_TOKEN: 401,
    API_TOKEN_REVOKED: 401,

    // 403: authenticated, not allowed.
    FORBIDDEN: 403,
    API_TOKEN_IDENTIFIER_MISMATCH: 403,

    // 404
    NOT_FOUND: 404,

    // 409: the command does not fit the state of what it is sent to, or what already exists.
    INVALID_STATE: 409,
    SYSTEM_BUSY: 409,
    API_TOKEN_LABEL_EXISTS: 409,
    ALREADY_EXISTS: 409,
    CONFLICT: 409,

    // 413
    FILE_TOO_LARGE: 413,

    // 500
    INTERNAL_SERVER_ERROR: 500,
    BLUEPRINT_ACTIVATION_FAILED: 500,
    BLUEPRINT_DEACTIVATION_FAILED: 500,

    // 502: something the server depends on does not answer.
    UNREACHABLE: 502,

    // 503: the server cannot take the command yet or right now, and it may work in a moment.
    NOT_READY: 503,
    DISCONNECTED: 503,
    SERVICE_NOT_CONFIGURED: 503,
    APP_ENTRY_NOT_CONFIGURED: 503,

    // 504
    TIMEOUT: 504,
};

export const statusOf = (code: ErrorCode): number => ERROR_STATUS[code];
