import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLocationToSystemConfig1744444800000 implements MigrationInterface {
    name = "AddLocationToSystemConfig1744444800000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`system_config\` ADD \`latitude\` decimal(10,7) NULL`
        );
        await queryRunner.query(
            `ALTER TABLE \`system_config\` ADD \`longitude\` decimal(10,7) NULL`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `ALTER TABLE \`system_config\` DROP COLUMN \`longitude\``
        );
        await queryRunner.query(
            `ALTER TABLE \`system_config\` DROP COLUMN \`latitude\``
        );
    }
}
