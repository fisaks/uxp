import { AppErrorV2 } from "@uxp/bff-common";
import { FastifyRequest } from "fastify";
import env, { OptionalKeys } from "../config/env";

/**
 * Validates that the request has a valid Bearer token matching the given env var.
 * Throws 500 if the env var is not configured, 401 if the token is missing or invalid.
 */
export function requireApiKey(req: FastifyRequest, envKey: OptionalKeys): void {
    const apiKey = env[envKey];
    if (!apiKey) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: `${envKey} is not configured` });
    }
    const authHeader = req.headers["authorization"];
    if (!authHeader?.startsWith("Bearer ")) {
        throw new AppErrorV2({ statusCode: 401, code: "UNAUTHORIZED", message: "Missing Authorization header" });
    }
    if (authHeader.slice("Bearer ".length) !== apiKey) {
        throw new AppErrorV2({ statusCode: 401, code: "UNAUTHORIZED", message: "Invalid API key" });
    }
}
