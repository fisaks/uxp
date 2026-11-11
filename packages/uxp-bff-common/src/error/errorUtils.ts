import { FastifyReply, FastifyRequest } from "fastify";
import { ErrorCode, ErrorDetail } from "@uxp/common";
import { createErrorResponse, toErrorDetail } from "./errorResponse";
import { AppErrorV2 } from "./AppError";
import { AppLogger } from "../utils/AppLogger";

interface ErrorResponseOptions {
    reply: FastifyReply;
    req: FastifyRequest;
    code: ErrorCode;
    message?: string;
    params?: ErrorDetail["params"];
    statusCode?: number; // Optional, default to 400
}

export function sendErrorResponse({ reply, req, code, message, params, statusCode = 400 }: ErrorResponseOptions): FastifyReply {
    AppLogger.error(req, { object: { code, message, params } });
    return reply.status(statusCode).send(createErrorResponse([toErrorDetail(new AppErrorV2({ statusCode, code, message, params }))], req));
}
