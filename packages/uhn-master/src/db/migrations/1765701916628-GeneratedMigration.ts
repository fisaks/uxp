import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1765701916628 implements MigrationInterface {
    name = 'GeneratedMigration1765701916628'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blueprint\` ADD \`installLog\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`blueprint\` ADD \`errorSummary\` varchar(1024) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blueprint\` DROP COLUMN \`errorSummary\``);
        await queryRunner.query(`ALTER TABLE \`blueprint\` DROP COLUMN \`installLog\``);
    }

}
