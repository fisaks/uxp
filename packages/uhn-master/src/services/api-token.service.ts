import { ApiTokenCreateResponse, ApiTokenInfo } from "@uhn/common";
import { AppErrorV2, AppLogger } from "@uxp/bff-common";
import { createHash, randomBytes } from "crypto";
import { DateTime } from "luxon";
import { ApiTokenEntity } from "../db/entities/ApiTokenEntity";
import { ApiTokenRepository } from "../repositories/api-token.repository";

function hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
}

function toApiTokenInfo(entity: ApiTokenEntity): ApiTokenInfo {
    return {
        id: entity.id,
        label: entity.label,
        blueprintIdentifier: entity.blueprintIdentifier,
        lastFourChars: entity.lastFourChars,
        createdAt: entity.createdAt.toISO() ?? "",
        createdBy: entity.createdBy,
        lastUsedAt: entity.lastUsedAt?.toISO() ?? undefined,
        revokedAt: entity.revokedAt?.toISO() ?? undefined,
    };
}

async function createToken(label: string, blueprintIdentifier: string, createdBy: string): Promise<ApiTokenCreateResponse> {
    const plainToken = randomBytes(32).toString("hex");
    const tokenHash = hashToken(plainToken);
    const lastFourChars = plainToken.slice(-4);

    const entity = new ApiTokenEntity({
        tokenHash,
        lastFourChars,
        label,
        blueprintIdentifier,
        createdBy,
    });

    const saved = await ApiTokenRepository.save(entity);

    AppLogger.info({
        message: `API token created: label="${label}" blueprintIdentifier="${blueprintIdentifier}" by ${createdBy}`,
    });

    return {
        id: saved.id,
        token: plainToken,
        label: saved.label,
        blueprintIdentifier: saved.blueprintIdentifier,
    };
}

async function verifyToken(bearerToken: string): Promise<ApiTokenEntity> {
    const tokenHash = hashToken(bearerToken);
    const entity = await ApiTokenRepository.findByTokenHash(tokenHash);

    if (!entity) {
        throw new AppErrorV2({ statusCode: 401, code: "INVALID_API_TOKEN", message: "The provided API token is invalid." });
    }

    if (entity.revokedAt) {
        throw new AppErrorV2({ statusCode: 401, code: "API_TOKEN_REVOKED", message: "The provided API token has been revoked." });
    }

    return entity;
}

async function revokeToken(id: number): Promise<void> {
    const entity = await ApiTokenRepository.findById(id);
    if (!entity) {
        throw new AppErrorV2({ statusCode: 404, code: "RESOURCE_NOT_FOUND", message: `API token with id ${id} not found` });
    }

    entity.revokedAt = DateTime.now();
    await ApiTokenRepository.save(entity);

    AppLogger.info({
        message: `API token revoked: id=${id} label="${entity.label}"`,
    });
}

async function listTokens(): Promise<ApiTokenInfo[]> {
    const entities = await ApiTokenRepository.findAll();
    return entities.map(toApiTokenInfo);
}

export const apiTokenService = {
    createToken,
    verifyToken,
    revokeToken,
    listTokens,
};
