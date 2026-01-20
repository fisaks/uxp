import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1768678592137 implements MigrationInterface {
    name = 'GeneratedMigration1768678592137'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`system_config\` DROP COLUMN \`updatedAt\``);
        await queryRunner.query(`ALTER TABLE \`system_config\` ADD \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`system_config\` DROP COLUMN \`createdAt\``);
        await queryRunner.query(`ALTER TABLE \`system_config\` ADD \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`system_config\` DROP COLUMN \`createdAt\``);
        await queryRunner.query(`ALTER TABLE \`system_config\` ADD \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)`);
        await queryRunner.query(`ALTER TABLE \`system_config\` DROP COLUMN \`updatedAt\``);
        await queryRunner.query(`ALTER TABLE \`system_config\` ADD \`updatedAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)`);
    }

}
