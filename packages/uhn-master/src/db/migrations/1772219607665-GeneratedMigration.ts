import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1772219607665 implements MigrationInterface {
    name = 'GeneratedMigration1772219607665'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`system_config\` ADD \`debugPort\` int NOT NULL DEFAULT 9250`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`system_config\` DROP COLUMN \`debugPort\``);
    }

}
