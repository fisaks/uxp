import { AppErrorV2, getRequestContext } from "@uxp/bff-common";
import { IsNull } from "typeorm";
import { BlueprintActivationEntity } from "../db/entities/BlueprintActivationEntity";



function getRepo() {
    const { queryRunner } = getRequestContext(true);
    if (!queryRunner) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "QueryRunner is missing in request context" });
    }
    return queryRunner.manager.getRepository(BlueprintActivationEntity);
}
async function findLastActiveForBlueprint(blueprintId: number): Promise<BlueprintActivationEntity | null> {
    return getRepo().findOne({
        where: { blueprint: { id: blueprintId }, deactivatedAt: IsNull() },
        order: { activatedAt: "DESC" }
    });
}

async function findAllForBlueprint(blueprintId: number): Promise<BlueprintActivationEntity[]> {
    return getRepo().find({
        where: { blueprint: { id: blueprintId } },
        order: { activatedAt: "DESC" },
    });
}
async function findAll(limit: number) {
    return getRepo().find({
        relations: ["blueprint"],
        order: { activatedAt: "DESC" },
        take: limit,
    })
}

async function save(entity: BlueprintActivationEntity): Promise<BlueprintActivationEntity> {
    return getRepo().save(entity);
}

export const BlueprintActivationRepository = {
    findLastActiveForBlueprint,
    findAllForBlueprint,
    findAll,
    save,
};
