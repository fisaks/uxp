import { ApiErrorResponse } from "./error.types";
import { ErrorCodes } from "./ErrorCodes";

export const normalizeError = (error: unknown): ApiErrorResponse => {
    if (typeof error === "object" && error !== null && "errors" in error) {
        return error as ApiErrorResponse;
    }

    return {
        errors: [
            {
                code: ErrorCodes.INTERNAL_SERVER_ERROR,
                message: "An unexpected error occurred.",
            },
        ],
        details: {
            timestamp: new Date().toISOString(),
            path: "unknown",
            correlationId: "unknown",
        },
    };
};
