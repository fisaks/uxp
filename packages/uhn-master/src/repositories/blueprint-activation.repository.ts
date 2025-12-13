import { IsNull, QueryRunner } from "typeorm";
import { BlueprintActivationEntity } from "../db/entities/BlueprintActivationEntity";

export class BlueprintActivationRepository {
    constructor(private queryRunner: QueryRunner) { }

    async findLastActiveForBlueprint(blueprintId: number): Promise<BlueprintActivationEntity | null> {
        return this.queryRunner.manager.getRepository(BlueprintActivationEntity).findOne({
            where: { blueprint: { id: blueprintId }, deactivatedAt: IsNull() },
            order: { activatedAt: "DESC" }
        });
    }

    async findAllForBlueprint(blueprintId: number): Promise<BlueprintActivationEntity[]> {
        return this.queryRunner.manager.getRepository(BlueprintActivationEntity).find({
            where: { blueprint: { id: blueprintId } },
            order: { activatedAt: "DESC" },
        });
    }
    async findAll(limit: number) {
        return this.queryRunner.manager.getRepository(BlueprintActivationEntity).find({
            relations: ["blueprint"],
            order: { activatedAt: "DESC" },
            take: limit,
        })
    }

    async save(entity: BlueprintActivationEntity): Promise<BlueprintActivationEntity> {
        return this.queryRunner.manager.getRepository(BlueprintActivationEntity).save(entity);
    }
}
