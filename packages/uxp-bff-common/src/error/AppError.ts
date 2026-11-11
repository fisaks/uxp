import { ErrorCode } from "@uxp/common";

export class AppErrorV2 extends Error {
    statusCode: number;
    code: ErrorCode;
    params?: Record<string, string | number>;
    // The underlying error. Not enumerable, so it is never serialized into a response (it can carry request config, credentials).
    declare readonly cause?: Error;

    constructor({
        statusCode = 500,
        code,
        message,
        params,
        originalError
    }: {
        statusCode?: number;
        code: ErrorCode;
        message?: string;
        params?: Record<string, string | number>;
        originalError?: Error;
    }) {
        super(message);

        this.statusCode = statusCode;
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
