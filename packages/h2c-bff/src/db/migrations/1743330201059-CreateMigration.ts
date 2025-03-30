import { In, MigrationInterface, QueryRunner } from "typeorm";
import { FieldKeyEntity } from "../entities/FieldKeyEntity";

export class CreateMigration1743330201059 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const repo = queryRunner.manager.getRepository(FieldKeyEntity);
        const type = "building";

        const defaultKeys = [
            "Floor Count",
            "Area Size"
        ];

        for (const key of defaultKeys) {
            const normalizedKey = key.trim().toLowerCase();

            const exists = await repo.findOneBy({ type, normalizedKey });
            if (!exists) {
                const newKey = repo.create({ type, key, normalizedKey });
                await repo.save(newKey);
            }
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.manager.delete(FieldKeyEntity, {
            type: "building",
            normalizedKey: In(["floor count", "area size"]),
        });
    }

}
