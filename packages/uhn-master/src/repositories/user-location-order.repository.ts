import { AppErrorV2, getRequestContext } from "@uxp/bff-common";
import { UserLocationOrderEntity } from "../db/entities/UserLocationOrderEntity";

function getRepo() {
    const { queryRunner } = getRequestContext(true);
    if (!queryRunner) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "QueryRunner is missing in request context" });
    }
    return queryRunner.manager.getRepository(UserLocationOrderEntity);
}

async function findByUser(blueprintIdentifier: string, username: string): Promise<UserLocationOrderEntity[]> {
    return getRepo().find({
        where: { blueprintIdentifier, username },
    });
}

async function findByUserAndLocation(blueprintIdentifier: string, username: string, locationId: string): Promise<UserLocationOrderEntity | null> {
    return getRepo().findOne({
        where: { blueprintIdentifier, username, locationId },
    });
}

async function save(entity: UserLocationOrderEntity): Promise<UserLocationOrderEntity> {
    return getRepo().save(entity);
}

async function removeByUserAndLocation(blueprintIdentifier: string, username: string, locationId: string): Promise<number> {
    const result = await getRepo().delete({ blueprintIdentifier, username, locationId });
    return result.affected ?? 0;
}

export const UserLocationOrderRepository = {
    findByUser,
    findByUserAndLocation,
    save,
    removeByUserAndLocation,
};
