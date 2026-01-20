import { AppErrorV2, getRequestContext } from "@uxp/bff-common";
import { SystemConfigEntity } from "../db/entities/SystemConfigEntity";

const CONFIG_ID = 1;
function getRepo() {
    const { queryRunner } = getRequestContext(true);
    if (!queryRunner) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "QueryRunner is missing in request context" });
    }
    return queryRunner.manager.getRepository(SystemConfigEntity);
}

async function save(entity: SystemConfigEntity): Promise<SystemConfigEntity> {
    entity.id = CONFIG_ID;
    await getRepo().save(entity);
    return findSystemConfig() as Promise<SystemConfigEntity>;
}
async function findSystemConfig(): Promise<SystemConfigEntity | null> {
    return await getRepo().findOneBy({ id: CONFIG_ID });
}

export const SystemConfigRepository = {
    findSystemConfig,
    save,
};

