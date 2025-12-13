import { QueryRunner } from "typeorm";
import { BlueprintEntity } from "../db/entities/BlueprintEntity";

export class BlueprintRepository {
    constructor(private queryRunner: QueryRunner) { }

    async findByIdentifierAndVersion(identifier: string, version: number): Promise<BlueprintEntity | null> {
        return this.queryRunner.manager.getRepository(BlueprintEntity).findOne({
            where: { identifier, version },
        });
    }

    async findLatestVersion(identifier: string): Promise<BlueprintEntity | null> {
        return this.queryRunner.manager.getRepository(BlueprintEntity).findOne({
            where: { identifier },
            order: { version: "DESC" },
        });
    }

    async save(entity: BlueprintEntity): Promise<BlueprintEntity> {
        return this.queryRunner.manager.getRepository(BlueprintEntity).save(entity);
    }

    async remove(entity: BlueprintEntity): Promise<void> {
        await this.queryRunner.manager.getRepository(BlueprintEntity).remove(entity);
    }

    async findAllSorted(): Promise<BlueprintEntity[]> {
        return this.queryRunner.manager.getRepository(BlueprintEntity).find({
            order: { identifier: "ASC", version: "DESC" },
        });
    }

    async findActive(): Promise<BlueprintEntity | null> {
        return this.queryRunner.manager.getRepository(BlueprintEntity).findOne({
            where: { active: true },
        });
    }

    async findById(id: number): Promise<BlueprintEntity | null> {
        return this.queryRunner.manager.getRepository(BlueprintEntity).findOne({
            where: { id },
        });
    }
    
    async getNextBlueprintVersion(identifier: string): Promise<number> {
        const repo = this.queryRunner.manager.getRepository(BlueprintEntity);

        const last = await repo.findOne({
            where: { identifier },
            order: { version: 'DESC' },
        });

        return last ? last.version + 1 : 1;
    }



}

