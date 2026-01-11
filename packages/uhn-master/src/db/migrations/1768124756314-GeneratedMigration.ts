import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1768124756314 implements MigrationInterface {
    name = 'GeneratedMigration1768124756314'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blueprint\` CHANGE \`status\` \`status\` enum ('idle', 'extracted', 'extraction_failed', 'compiled', 'compile_failed') NOT NULL DEFAULT 'idle'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blueprint\` CHANGE \`status\` \`status\` enum ('idle', 'extracted', 'compiled') NOT NULL DEFAULT 'idle'`);
    }

}
