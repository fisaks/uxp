import { AppErrorV2, getRequestContext } from "@uxp/bff-common";
import { AppEntity } from "../db/entities/AppEntity";
import { PageAppsEntity } from "../db/entities/PageAppsEntity";

function getPageAppsRepo() {
    const { queryRunner } = getRequestContext(true);
    if (!queryRunner) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "QueryRunner is missing in request context" });
    }
    return queryRunner.manager.getRepository(PageAppsEntity);
}

function getAppsRepo() {
    const { queryRunner } = getRequestContext(true);
    if (!queryRunner) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "QueryRunner is missing in request context" });
    }
    return queryRunner.manager.getRepository(AppEntity);
}

async function getPageAppByContentUuid(uuid: string): Promise<PageAppsEntity | null> {
    return await getPageAppsRepo()
        .createQueryBuilder("pageApps")
        .leftJoinAndSelect("pageApps.app", "app")
        .where("pageApps.uuid = :uuid", { uuid })
        .getOne();
}

async function getAppByIdentifier(appIdentifier: string): Promise<AppEntity | null> {
    return await getAppsRepo().findOneBy({ identifier: appIdentifier });
}

export const RemoteAppRepository = {
    getPageAppByContentUuid,
    getAppByIdentifier
};
