import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1742129431329 implements MigrationInterface {
    name = 'GeneratedMigration1742129431329'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`d_snapshots\` DROP COLUMN \`update\``);
        await queryRunner.query(`ALTER TABLE \`d_snapshots\` ADD \`update\` blob NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`documents\` DROP COLUMN \`content\``);
        await queryRunner.query(`ALTER TABLE \`documents\` ADD \`content\` mediumblob NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`documents\` DROP COLUMN \`content\``);
        await queryRunner.query(`ALTER TABLE \`documents\` ADD \`content\` mediumtext NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`d_snapshots\` DROP COLUMN \`update\``);
        await queryRunner.query(`ALTER TABLE \`d_snapshots\` ADD \`update\` longblob NOT NULL`);
    }

}
