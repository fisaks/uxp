import { FastifyInstance, FastifyRequest } from "fastify";
import { Token } from "../types/token.types";

type LogMessage = {
    message?: string;
    args?: unknown[];
    object?: Record<string, unknown>;
};

type ErrorLogMessage = LogMessage & {
    error?: Error;
};

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

    private static extractMetadata(request?: FastifyRequest): Record<string, unknown> {
        if (!request) {
            return {}; // Return empty metadata if request is not available
        }
        return {
            uuid: (request.user as Token)?.uuid,
            username: (request.user as Token)?.username,
            ip: request.ip,
            userAgent: request.headers["user-agent"],
        };
    }

    private static mergeData(
        metadata: Record<string, unknown>,
        object?: Record<string, unknown>,
        error?: Error
    ): Record<string, unknown> {
        return {
            ...metadata,
            ...object,
            ...(error ? { err: error } : {}),
        };
    }

    private static log(
        request: FastifyRequest | undefined,
        level: "info" | "warn" | "error" | "debug",
        message: ErrorLogMessage
    ) {
        this.ensureInitialized();

        const metadata = this.extractMetadata(request);
        const data = this.mergeData(metadata, message.object, message.error);

        this.fastifyLogger[level](data, message.message, ...(message.args ?? []));
    }

    public static info(request: FastifyRequest | undefined, message: LogMessage) {
        this.log(request, "info", message);
    }

    public static warn(request: FastifyRequest | undefined, message: LogMessage) {
        this.log(request, "warn", message);
    }

    public static error(request: FastifyRequest | undefined, message: ErrorLogMessage) {
        this.log(request, "error", message);
    }

    public static debug(request: FastifyRequest | undefined, message: LogMessage) {
        this.log(request, "debug", message);
    }

    public static infoMessage(request: FastifyRequest | undefined, message: string, ...args: unknown[]) {
        this.info(request, { message, args });
    }

    public static warnMessage(request: FastifyRequest | undefined, message: string, ...args: unknown[]) {
        this.warn(request, { message, args });
    }

    public static errorMessage(request: FastifyRequest | undefined, message: string, ...args: unknown[]) {
        const possibleError = args[args.length - 1];
        const error = possibleError instanceof Error ? possibleError : undefined;

        const formattedArgs = error ? args.slice(0, -1) : args;

        this.error(request, { message, args: formattedArgs, error });
    }

    public static debugMessage(request: FastifyRequest | undefined, message: string, ...args: unknown[]) {
        this.debug(request, { message, args });
    }
}
