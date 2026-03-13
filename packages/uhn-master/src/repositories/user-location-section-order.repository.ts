import { AppErrorV2, getRequestContext } from "@uxp/bff-common";
import { UserLocationSectionOrderEntity } from "../db/entities/UserLocationSectionOrderEntity";

function getRepo() {
    const { queryRunner } = getRequestContext(true);
    if (!queryRunner) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "QueryRunner is missing in request context" });
    }
    return queryRunner.manager.getRepository(UserLocationSectionOrderEntity);
}

async function findByUser(blueprintIdentifier: string, username: string): Promise<UserLocationSectionOrderEntity | null> {
    return getRepo().findOne({
        where: { blueprintIdentifier, username },
    });
}

async function save(entity: UserLocationSectionOrderEntity): Promise<UserLocationSectionOrderEntity> {
    return getRepo().save(entity);
}

async function removeByUser(blueprintIdentifier: string, username: string): Promise<number> {
    const result = await getRepo().delete({ blueprintIdentifier, username });
    return result.affected ?? 0;
}

export const UserLocationSectionOrderRepository = {
    findByUser,
    save,
    removeByUser,
};
