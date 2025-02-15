import { FastifyInstance, FastifyRequest } from "fastify";

import { Token } from "../types/token.types";

type LogMessage = {
    message?: string;
    args?: unknown[];
    object?: Record<string, unknown>;
};

type ErrorLogMessage = LogMessage & {
    error?: Error | unknown;
};

/**
 * A simple logger that logs messages with metadata.
 *
 * This logger can be initialized with a Fastify logger instance and provides methods to log messages at different levels (info, warn, error, debug).
 * If not initialized, it falls back to using the console for logging.
 *
 * @example
 * ```typescript
 * AppLogger.initialize(fastify.log);
 * AppLogger.info(req, { message: "Page app not found %s", args: [uuid] });
 * AppLogger.error(req, { message: "Failed to fetch or rewrite index.html", error: error as Error });
 * AppLogger.error(undefined, { error: err as Error });
 * AppLogger.warn(req, { message: `Failed login attempt ${user.failedLoginAttempts}/${MAX_FAILD_LOGIN}` });
 * ```
 */

export type RequestMetaData = {
    uuid?: string;
    username?: string;
    ip: string;
    userAgent: string;
    requestId: string;
}
export class AppLogger {
    private static fastifyLogger: FastifyInstance["log"] | typeof console;

    public static initialize(logger: FastifyInstance["log"]) {
        if (!this.fastifyLogger) {
            this.fastifyLogger = logger;
        } else {
            console.warn("AppLogger has already been initialized. Initialization skipped.");
        }
    }

    private static ensureInitialized() {
        if (!this.fastifyLogger) {
            console.warn("AppLogger has not been initialized. Logs may not be recorded.");
            this.fastifyLogger = console; // Fallback to console
        }
    }

    private static isRequestMetaData(request: FastifyRequest | RequestMetaData): request is RequestMetaData {
        return (request as RequestMetaData).requestId !== undefined;
    }

    public static extractMetadata(request?: FastifyRequest): RequestMetaData | undefined {
        if (!request) {
            return undefined;
        }
        return {
            uuid: (request.user as Token)?.uuid,
            username: (request.user as Token)?.username,
            ip: request.ip,
            userAgent: request.headers["user-agent"],
            requestId: request.id,
        } as RequestMetaData;
    }

    private static mergeData(
        metadata: Record<string, unknown>,
        object?: Record<string, unknown>,
        error?: Error | unknown
    ): Record<string, unknown> {
        return {
            ...metadata,
            ...object,
            ...(error ? { err: error } : {}),
        };
    }

    private static log(request: FastifyRequest | RequestMetaData | undefined, level: "info" | "warn" | "error" | "debug", message: ErrorLogMessage) {
        this.ensureInitialized();

        const metadata = !request ? {} : this.isRequestMetaData(request) ? request : this.extractMetadata(request) ?? {};
        const data = this.mergeData(metadata, message.object, message.error);

        this.fastifyLogger[level](data, message.message, ...(message.args ?? []));
    }

    public static info(request: FastifyRequest | RequestMetaData | undefined, message: LogMessage) {
        this.log(request, "info", message);
    }

    public static warn(request: FastifyRequest | RequestMetaData | undefined, message: ErrorLogMessage) {
        this.log(request, "warn", message);
    }

    public static error(request: FastifyRequest | RequestMetaData | undefined, message: ErrorLogMessage) {
        this.log(request, "error", message);
    }

    public static debug(request: FastifyRequest | RequestMetaData | undefined, message: LogMessage) {
        this.log(request, "debug", message);
    }

    public static infoMessage(request: FastifyRequest | RequestMetaData | undefined, message: string, ...args: unknown[]) {
        this.info(request, { message, args });
    }

    public static warnMessage(request: FastifyRequest | RequestMetaData | undefined, message: string, ...args: unknown[]) {
        this.warn(request, { message, args });
    }

    public static errorMessage(request: FastifyRequest | RequestMetaData | undefined, message: string, ...args: unknown[]) {
        const possibleError = args[args.length - 1];
        const error = possibleError instanceof Error ? possibleError : undefined;

        const formattedArgs = error ? args.slice(0, -1) : args;

        this.error(request, { message, args: formattedArgs, error });
    }

    public static debugMessage(request: FastifyRequest | RequestMetaData | undefined, message: string, ...args: unknown[]) {
        this.debug(request, { message, args });
    }
}
