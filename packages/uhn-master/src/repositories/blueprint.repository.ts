import { AppErrorV2, getRequestContext } from "@uxp/bff-common";
import { BlueprintEntity } from "../db/entities/BlueprintEntity";


function getRepo() {
    const { queryRunner } = getRequestContext(true);
    if (!queryRunner) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "QueryRunner is missing in request context" });
    }
    return queryRunner.manager.getRepository(BlueprintEntity);
}
async function findByIdentifierAndVersion(identifier: string, version: number): Promise<BlueprintEntity | null> {
    return getRepo().findOne({
        where: { identifier, version },
    });
}

async function findLatestVersion(identifier: string): Promise<BlueprintEntity | null> {
    return getRepo().findOne({
        where: { identifier },
        order: { version: "DESC" },
    });
}

async function save(entity: BlueprintEntity): Promise<BlueprintEntity> {
    return getRepo().save(entity);
}

async function remove(entity: BlueprintEntity): Promise<void> {
    await getRepo().remove(entity);
}

async function findAllSorted(): Promise<BlueprintEntity[]> {
    return getRepo().find({
        order: { identifier: "ASC", version: "DESC" },
    });
}

async function findActive(): Promise<BlueprintEntity | null> {
    return getRepo().findOne({
        where: { active: true },
    });
}

async function findById(id: number): Promise<BlueprintEntity | null> {
    return getRepo().findOne({
        where: { id },
    });
}

async function getNextBlueprintVersion(identifier: string): Promise<number> {
    const repo = getRepo();

    const last = await repo.findOne({
        where: { identifier },
        order: { version: 'DESC' },
    });

    return last ? last.version + 1 : 1;
}



export const BlueprintRepository = {
    findByIdentifierAndVersion,
    findLatestVersion,
    save,
    remove,
    findAllSorted,
    findActive,
    findById,
    getNextBlueprintVersion,
};

