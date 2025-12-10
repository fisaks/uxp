import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1764787772151 implements MigrationInterface {
    name = 'GeneratedMigration1764787772151'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blueprint\` DROP COLUMN \`installedAt\``);
        await queryRunner.query(`ALTER TABLE \`blueprint\` ADD \`lastActivatedAt\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`blueprint\` ADD \`lastActivatedBy\` varchar(64) NULL`);
        await queryRunner.query(`ALTER TABLE \`blueprint\` ADD \`lastDeactivatedAt\` datetime NULL`);
        await queryRunner.query(`ALTER TABLE \`blueprint\` ADD \`lastDeactivatedBy\` varchar(64) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blueprint\` DROP COLUMN \`lastDeactivatedBy\``);
        await queryRunner.query(`ALTER TABLE \`blueprint\` DROP COLUMN \`lastDeactivatedAt\``);
        await queryRunner.query(`ALTER TABLE \`blueprint\` DROP COLUMN \`lastActivatedBy\``);
        await queryRunner.query(`ALTER TABLE \`blueprint\` DROP COLUMN \`lastActivatedAt\``);
        await queryRunner.query(`ALTER TABLE \`blueprint\` ADD \`installedAt\` datetime NULL`);
    }

}
