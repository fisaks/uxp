import { AppErrorV2, getRequestContext } from "@uxp/bff-common";
import { UserScheduleEntity } from "../db/entities/UserScheduleEntity";

function getRepo() {
    const { queryRunner } = getRequestContext(true);
    if (!queryRunner) {
        throw new AppErrorV2({ statusCode: 500, code: "INTERNAL_SERVER_ERROR", message: "QueryRunner is missing in request context" });
    }
    return queryRunner.manager.getRepository(UserScheduleEntity);
}

async function findAll(): Promise<UserScheduleEntity[]> {
    return getRepo().find();
}

async function findByBlueprint(blueprintIdentifier: string): Promise<UserScheduleEntity[]> {
    return getRepo().find({
        where: { blueprintIdentifier },
        order: { createdAt: "ASC" },
    });
}

async function findById(id: number): Promise<UserScheduleEntity | null> {
    return getRepo().findOneBy({ id });
}

async function findByScheduleId(blueprintIdentifier: string, scheduleId: string): Promise<UserScheduleEntity | null> {
    return getRepo().findOne({
        where: { blueprintIdentifier, scheduleId },
    });
}

async function save(entity: UserScheduleEntity): Promise<UserScheduleEntity> {
    return getRepo().save(entity);
}

async function remove(entity: UserScheduleEntity): Promise<UserScheduleEntity> {
    return getRepo().remove(entity);
}

export const UserScheduleRepository = {
    findAll,
    findByBlueprint,
    findById,
    findByScheduleId,
    save,
    remove,
};
