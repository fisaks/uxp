import { FastifyInstance, FastifyRequest } from "fastify";

import { AppErrorV2 } from "../error/AppError";
import { Token } from "../types/token.types";
import { getRequestContext } from "../decorator/request-context";

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
    sessionId?: string;
}

type InfoLogArgs =
    | [requestMeta: FastifyRequest | RequestMetaData | undefined, payload: LogMessage]
    | [payload: LogMessage]; // con
type ErrorLogArgs =
    | [requestMeta: FastifyRequest | RequestMetaData | undefined, payload: ErrorLogMessage]
    | [payload: ErrorLogMessage]; // con

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

    public static extractMetadata(request?: FastifyRequest | RequestMetaData, required = false): RequestMetaData | undefined {
        if (!request) {
            if (required) {
                throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "Request metadata is required" });
            }
            return undefined;
        }
        if (this.isRequestMetaData(request)) {
            return request;
        }
        return {
            uuid: (request.user as Token)?.uuid,
            username: (request.user as Token)?.username,
            ip: request.ip,
            userAgent: request.headers["user-agent"],
            requestId: request.id,
            sessionId: (request.user as Token)?.sessionId,

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
    public static extractRequestMetaFromArgs(args: InfoLogArgs): [RequestMetaData | undefined, LogMessage | ErrorLogMessage] {
        if (args.length === 2 ) {
            return [args[0] as RequestMetaData | undefined, args[1]];
        } else if (args.length === 1) {
            const ctx = getRequestContext();
            return [ctx.requestMeta, args[0]];
        }
        throw new Error("Invalid number of arguments");

    }

    public static info(...args: InfoLogArgs) {
        const [request, message] = this.extractRequestMetaFromArgs(args);
        this.log(request, "info", message);
    }

    public static warn(...args: ErrorLogArgs) {
        const [request, message] = this.extractRequestMetaFromArgs(args);
        this.log(request, "warn", message);
    }
    
    public static error(...args: ErrorLogArgs) {
        const [request, message] = this.extractRequestMetaFromArgs(args);
        this.log(request, "error", message);
    }

    public static debug(...args: InfoLogArgs) {
        const [request, message] = this.extractRequestMetaFromArgs(args);
        this.log(request, "debug", message);
    }

    /*    public static infoMessage(request: FastifyRequest | RequestMetaData | undefined, message: string, ...args: unknown[]) {
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
        }*/
}
