import { AppErrorV2, getRequestContext } from "@uxp/bff-common";
import { UserLocationItemOrderEntity } from "../db/entities/UserLocationItemOrderEntity";

function getRepo() {
    const { queryRunner } = getRequestContext(true);
    if (!queryRunner) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "QueryRunner is missing in request context" });
    }
    return queryRunner.manager.getRepository(UserLocationItemOrderEntity);
}

async function findByUser(blueprintIdentifier: string, username: string): Promise<UserLocationItemOrderEntity[]> {
    return getRepo().find({
        where: { blueprintIdentifier, username },
    });
}

async function findByUserAndLocation(blueprintIdentifier: string, username: string, locationId: string): Promise<UserLocationItemOrderEntity | null> {
    return getRepo().findOne({
        where: { blueprintIdentifier, username, locationId },
    });
}

async function save(entity: UserLocationItemOrderEntity): Promise<UserLocationItemOrderEntity> {
    return getRepo().save(entity);
}

async function removeByUserAndLocation(blueprintIdentifier: string, username: string, locationId: string): Promise<number> {
    const result = await getRepo().delete({ blueprintIdentifier, username, locationId });
    return result.affected ?? 0;
}

export const UserLocationItemOrderRepository = {
    findByUser,
    findByUserAndLocation,
    save,
    removeByUserAndLocation,
};
