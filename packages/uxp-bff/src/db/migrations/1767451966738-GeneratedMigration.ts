import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1767451966738 implements MigrationInterface {
    name = 'GeneratedMigration1767451966738'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_845e77701228c752e9787e6220\` ON \`pages\``);
        await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`uuid\``);
        await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`localizedName\``);
        await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`metadata\``);
        await queryRunner.query(`ALTER TABLE \`pages\` DROP COLUMN \`localizedMetadata\``);
        await queryRunner.query(`ALTER TABLE \`routes\` DROP COLUMN \`localizedRoutePattern\``);
        await queryRunner.query(`ALTER TABLE \`routes\` DROP COLUMN \`localizedLink\``);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`routes\` ADD \`localizedLink\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`routes\` ADD \`localizedRoutePattern\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`pages\` ADD \`localizedMetadata\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`pages\` ADD \`metadata\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`pages\` ADD \`localizedName\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`pages\` ADD \`uuid\` char(36) NOT NULL`);
        await queryRunner.query(`CREATE UNIQUE INDEX \`IDX_845e77701228c752e9787e6220\` ON \`pages\` (\`uuid\`)`);
    }

}
