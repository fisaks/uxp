import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1735424119329 implements MigrationInterface {
    name = "GeneratedMigration1735424119329";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`apps\` ADD \`identifier\` varchar(255) NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`apps\` ADD UNIQUE INDEX \`IDX_7fa881ce1f18d91d9cebd7c62f\` (\`identifier\`)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`apps\` DROP INDEX \`IDX_7fa881ce1f18d91d9cebd7c62f\``);
        await queryRunner.query(`ALTER TABLE \`apps\` DROP COLUMN \`identifier\``);
    }
}
