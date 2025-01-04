import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1735997112616 implements MigrationInterface {
    name = "GeneratedMigration1735997112616";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`pages\` ADD \`config\` json NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`config\``);
    }
}
