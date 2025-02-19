import { ErrorCode } from "@uxp/common";

export class AppError extends Error {
    statusCode: number;
    code: ErrorCode;
    params?: Record<string, string | number>;
    originalError?: Error;

    // Constructor overloads
    constructor(code: ErrorCode, message?: string, params?: Record<string, string | number>);
    constructor(code: ErrorCode, message?: string, params?: Record<string, string | number>, originalError?: Error);
    constructor(statusCode: number, code: ErrorCode, message?: string, params?: Record<string, string | number>);
    constructor(statusCode: number, code: ErrorCode, message?: string, params?: Record<string, string | number>, originalError?: Error);


    // Unified implementation
    constructor(
        statusCodeOrCode: number | string,
        codeOrMessage?: string,
        messageOrParams?: string | Record<string, string | number>,
        paramsOrError?: Record<string, string | number> | Error,
        errorOrUndefined?: Error
    ) {
        if (typeof statusCodeOrCode === "number") {
            // Case: `statusCode` is explicitly provided
            super(messageOrParams as string);
            this.statusCode = statusCodeOrCode;
            this.code = codeOrMessage as ErrorCode;
            this.params = paramsOrError instanceof Error ? undefined : paramsOrError;
            this.originalError = paramsOrError instanceof Error ? paramsOrError : errorOrUndefined;
        } else {
            // Case: `statusCode` is not provided, default to 500
            super(codeOrMessage as string);
            this.statusCode = 500;
            this.code = statusCodeOrCode as ErrorCode;
            this.params = messageOrParams instanceof Error ? undefined : (messageOrParams as Record<string, string | number>);
            this.originalError = messageOrParams instanceof Error ? messageOrParams : (paramsOrError as Error);
        }

        // Append original stack trace if available
        if (this.originalError?.stack) {
            this.stack += `\nCaused by: ${this.originalError.stack}`;
        }

        // Maintain proper stack trace (only available in V8 environments)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}


export class AppErrorV2 extends Error {
    statusCode: number;
    code: ErrorCode;
    params?: Record<string, string | number>;
    originalError?: Error;

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
        this.originalError = originalError;

        if (this.originalError?.stack) {
            this.stack += `\nCaused by: ${this.originalError.stack}`;
        }

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
