import { AppErrorV2, getRequestContext } from "@uxp/bff-common";
import { IsNull } from "typeorm";
import { ApiTokenEntity } from "../db/entities/ApiTokenEntity";

function getRepo() {
    const { queryRunner } = getRequestContext(true);
    if (!queryRunner) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "QueryRunner is missing in request context" });
    }
    return queryRunner.manager.getRepository(ApiTokenEntity);
}

async function save(entity: ApiTokenEntity): Promise<ApiTokenEntity> {
    return getRepo().save(entity);
}

async function findByTokenHash(hash: string): Promise<ApiTokenEntity | null> {
    return getRepo().findOne({
        where: { tokenHash: hash },
    });
}

async function findAll(): Promise<ApiTokenEntity[]> {
    return getRepo().find({
        order: { createdAt: "DESC" },
    });
}

async function findById(id: number): Promise<ApiTokenEntity | null> {
    return getRepo().findOne({
        where: { id },
    });
}

async function findActiveByLabelAndIdentifier(label: string, blueprintIdentifier: string): Promise<ApiTokenEntity | null> {
    return getRepo().findOne({
        where: { label, blueprintIdentifier, revokedAt: IsNull() },
    });
}

export const ApiTokenRepository = {
    save,
    findByTokenHash,
    findAll,
    findById,
    findActiveByLabelAndIdentifier,
};
