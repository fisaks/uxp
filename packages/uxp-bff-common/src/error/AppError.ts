import { ErrorCode } from "@uxp/common";
import { statusOf } from "./errorStatus";

export class AppErrorV2 extends Error {
    code: ErrorCode;
    params?: Record<string, string | number>;
    // The underlying error. Not enumerable, so it is never serialized into a response (it can carry request config, credentials).
    declare readonly cause?: Error;

    /** The HTTP status of the code, for REST and for the log level. */
    get statusCode(): number {
        return statusOf(this.code);
    }

    constructor({
        code,
        message,
        params,
        originalError
    }: {
        code: ErrorCode;
        message?: string;
        params?: Record<string, string | number>;
        originalError?: Error;
    }) {
        super(message);

        this.code = code;
        this.params = params;
        if (originalError) {
            Object.defineProperty(this, "cause", { value: originalError, enumerable: false, writable: true, configurable: true });
        }

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }

        if (originalError?.stack) {
            this.stack += `\nCaused by: ${originalError.stack}`;
        }
    }
}
