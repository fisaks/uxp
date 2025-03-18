import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1741442154621 implements MigrationInterface {
    name = 'GeneratedMigration1741442154621'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`documents\` DROP COLUMN \`content\``);
        await queryRunner.query(`ALTER TABLE \`documents\` ADD \`content\` mediumtext NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`documents\` DROP COLUMN \`content\``);
        await queryRunner.query(`ALTER TABLE \`documents\` ADD \`content\` json NOT NULL`);
    }

}
