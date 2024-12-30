import { FastifyReply, FastifyRequest } from "fastify";
import { ErrorCode, ErrorDetail } from "@uxp/common";
import { createErrorResponse } from "@uxp/bff-common";

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
    return reply.status(statusCode).send(createErrorResponse([{ code, message, params }], req));
}
