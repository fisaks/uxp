import { ACCESS_TOKEN, AppError, AppLogger, REFRESH_TOKEN, RefreshToken, Token } from "@uxp/bff-common";
import { ErrorCodes } from "@uxp/common";
import { FastifyInstance, FastifyReply } from "fastify";
import { AccessTokenExpires, RefreshTokenExpires } from "../config/constant";

export function generateAccessToken(fastify: FastifyInstance, payload: Token): string {
    return fastify.jwt.sign(payload, { expiresIn: AccessTokenExpires });
}

export function generateRefreshToken(fastify: FastifyInstance, payload: RefreshToken): string {
    return fastify.jwt.sign(payload, { expiresIn: RefreshTokenExpires });
}

export function setAuthCookies(reply: FastifyReply, accessToken: string, refreshToken?: string): FastifyReply {
    reply.setCookie(ACCESS_TOKEN, accessToken, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
    });

    return refreshToken
        ? reply.setCookie(REFRESH_TOKEN, refreshToken, {
              httpOnly: true,
              secure: true,
              sameSite: "strict",
              path: "/",
          })
        : reply;
}

export function clearAuthCookies(reply: FastifyReply): FastifyReply {
    return reply.clearCookie(ACCESS_TOKEN, { path: "/" }).clearCookie(REFRESH_TOKEN, { path: "/" });
}

export const verifyRefreshToken = (fastify: FastifyInstance, refreshToken: string) => {
    try {
        return fastify.jwt.verify(refreshToken) as RefreshToken;
    } catch (err: unknown) {
        AppLogger.error(undefined, { error: err as Error });
        throw new AppError(
            401,
            ErrorCodes.INVALID_REFRESH_TOKEN,
            "Invalid or expired refresh token",
            undefined,
            err as Error
        );
    }
};
