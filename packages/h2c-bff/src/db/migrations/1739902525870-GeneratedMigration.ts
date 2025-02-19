import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1739902525870 implements MigrationInterface {
    name = 'GeneratedMigration1739902525870'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`documents\` ADD \`name\` varchar(150) NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`documents\` DROP COLUMN \`name\``);
    }

}
