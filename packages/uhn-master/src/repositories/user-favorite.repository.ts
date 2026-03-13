import { UserLocationItemKind } from "@uhn/common";
import { AppErrorV2, getRequestContext } from "@uxp/bff-common";
import { UserFavoriteEntity } from "../db/entities/UserFavoriteEntity";

function getRepo() {
    const { queryRunner } = getRequestContext(true);
    if (!queryRunner) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "QueryRunner is missing in request context" });
    }
    return queryRunner.manager.getRepository(UserFavoriteEntity);
}

async function findByUser(blueprintIdentifier: string, username: string): Promise<UserFavoriteEntity[]> {
    return getRepo().find({
        where: { blueprintIdentifier, username },
        order: { sortOrder: "ASC" },
    });
}

async function findByUserAndItem(blueprintIdentifier: string, username: string, itemKind: UserLocationItemKind, itemRefId: string): Promise<UserFavoriteEntity | null> {
    return getRepo().findOne({
        where: { blueprintIdentifier, username, itemKind, itemRefId },
    });
}

async function findByIdAndUser(id: number, username: string): Promise<UserFavoriteEntity | null> {
    return getRepo().findOne({
        where: { id, username },
    });
}

async function save(entity: UserFavoriteEntity): Promise<UserFavoriteEntity> {
    return getRepo().save(entity);
}

async function remove(entity: UserFavoriteEntity): Promise<UserFavoriteEntity> {
    return getRepo().remove(entity);
}

async function removeAllByUser(blueprintIdentifier: string, username: string): Promise<number> {
    const result = await getRepo().delete({ blueprintIdentifier, username });
    return result.affected ?? 0;
}

async function getMaxSortOrder(blueprintIdentifier: string, username: string): Promise<number> {
    const result = await getRepo()
        .createQueryBuilder("fav")
        .select("MAX(fav.sortOrder)", "maxOrder")
        .where("fav.blueprintIdentifier = :blueprintIdentifier AND fav.username = :username", { blueprintIdentifier, username })
        .getRawOne();
    return result?.maxOrder ?? -1;
}

export const UserFavoriteRepository = {
    findByUser,
    findByUserAndItem,
    findByIdAndUser,
    save,
    remove,
    removeAllByUser,
    getMaxSortOrder,
};
