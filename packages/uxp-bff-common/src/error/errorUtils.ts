import { FastifyReply, FastifyRequest } from "fastify";
import { ErrorCode, ErrorDetail } from "@uxp/common";
import { createErrorResponse } from "./errorResponse";
import { AppLogger } from "../utils/AppLogger";

interface ErrorResponseOptions {
    reply: FastifyReply;
    req: FastifyRequest;
    code: ErrorCode;
    message?: string;
    params?: ErrorDetail["params"];
    statusCode?: number; // Optional, default to 400
}

export function sendErrorResponse({
    reply,
    req,
    code,
    message,
    params,
    statusCode = 400,
}: ErrorResponseOptions): FastifyReply {
    AppLogger.error(req, {object:{ code, message, params }});
    return reply.status(statusCode).send(createErrorResponse([{ code, message, params }], req));
}
