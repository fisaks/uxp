import { AppErrorV2, getRequestContext } from "@uxp/bff-common";
import { DeviceAvailabilityEntity } from "../db/entities/DeviceAvailabilityEntity";

function getRepo() {
    const { queryRunner } = getRequestContext(true);
    if (!queryRunner) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "QueryRunner is missing in request context" });
    }
    return queryRunner.manager.getRepository(DeviceAvailabilityEntity);
}

async function findAll(): Promise<DeviceAvailabilityEntity[]> {
    return getRepo().find();
}

async function save(entity: DeviceAvailabilityEntity): Promise<DeviceAvailabilityEntity> {
    return getRepo().save(entity);
}

export const DeviceAvailabilityRepository = {
    findAll,
    save,
};
