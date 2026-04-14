import { AppErrorV2, getRequestContext } from "@uxp/bff-common";
import { ScheduleMuteEntity } from "../db/entities/ScheduleMuteEntity";

function getRepo() {
    const { queryRunner } = getRequestContext(true);
    if (!queryRunner) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "QueryRunner is missing in request context" });
    }
    return queryRunner.manager.getRepository(ScheduleMuteEntity);
}

async function findByBlueprint(blueprintIdentifier: string): Promise<ScheduleMuteEntity[]> {
    return getRepo().find({ where: { blueprintIdentifier } });
}

async function findByScheduleId(blueprintIdentifier: string, scheduleId: string): Promise<ScheduleMuteEntity | null> {
    return getRepo().findOne({ where: { blueprintIdentifier, scheduleId } });
}

async function save(entity: ScheduleMuteEntity): Promise<ScheduleMuteEntity> {
    return getRepo().save(entity);
}

async function remove(entity: ScheduleMuteEntity): Promise<ScheduleMuteEntity> {
    return getRepo().remove(entity);
}

export const ScheduleMuteRepository = {
    findByBlueprint,
    findByScheduleId,
    save,
    remove,
};
