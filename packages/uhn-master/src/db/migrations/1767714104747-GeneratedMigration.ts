import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1767714104747 implements MigrationInterface {
    name = 'GeneratedMigration1767714104747'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blueprint\` CHANGE \`status\` \`status\` enum ('idle', 'extracted', 'compiled','uploaded', 'installed', 'failed') NOT NULL DEFAULT 'idle'`);
        await queryRunner.query(`UPDATE \`blueprint\` SET \`status\` = 'idle' WHERE \`status\` IN ('uploaded', 'installed', 'failed')`);
        await queryRunner.query(`ALTER TABLE \`blueprint_activation\` ADD \`status\` enum ('idle', 'extracted', 'compiled') NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`blueprint\` CHANGE \`status\` \`status\` enum ('idle', 'extracted', 'compiled') NOT NULL DEFAULT 'idle'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blueprint\` CHANGE \`status\` \`status\` enum ('idle', 'extracted', 'compiled','uploaded', 'installed', 'failed') NOT NULL DEFAULT 'idle'`);
        await queryRunner.query(`UPDATE \`blueprint\` SET \`status\` = 'uploaded' WHERE \`status\` IN ('idle', 'extracted', 'compiled')`);
        await queryRunner.query(`ALTER TABLE \`blueprint\` CHANGE \`status\` \`status\` enum ('uploaded', 'validated', 'compiled', 'installed', 'failed', 'archived') NOT NULL DEFAULT 'uploaded'`);
        await queryRunner.query(`ALTER TABLE \`blueprint_activation\` DROP COLUMN \`status\``);
    }

}
