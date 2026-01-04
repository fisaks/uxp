import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1767456540650 implements MigrationInterface {
    name = 'GeneratedMigration1767456540650'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`page_apps\` DROP COLUMN \`urlPostfix\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`page_apps\` ADD \`urlPostfix\` varchar(255) NULL`);
    }

}
