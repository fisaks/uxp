import { FastifyReply, FastifyRequest } from "fastify";
import { ErrorCode, ErrorDetail } from "@uxp/common";
import { createErrorResponse, toErrorDetail } from "./errorResponse";
import { AppErrorV2 } from "./AppError";
import { statusOf } from "./errorStatus";
import { AppLogger } from "../utils/AppLogger";

interface ErrorResponseOptions {
    reply: FastifyReply;
    req: FastifyRequest;
    code: ErrorCode;
    message?: string;
    params?: ErrorDetail["params"];
}

export function sendErrorResponse({ reply, req, code, message, params }: ErrorResponseOptions): FastifyReply {
    AppLogger.error(req, { object: { code, message, params } });
    return reply.status(statusOf(code)).send(createErrorResponse(toErrorDetail(new AppErrorV2({ code, message, params })), req));
}
