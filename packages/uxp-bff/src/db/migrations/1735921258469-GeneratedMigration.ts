import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1735921258469 implements MigrationInterface {
    name = "GeneratedMigration1735921258469";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_settings\` DROP FOREIGN KEY \`FK_986a2b6d3c05eb4091bb8066f78\``);
        await queryRunner.query(
            `ALTER TABLE \`routes\` CHANGE \`unauthenticatedOnly\` \`accessType\` tinyint NOT NULL DEFAULT '0'`
        );
        await queryRunner.query(`ALTER TABLE \`routes\` DROP COLUMN \`accessType\``);
        await queryRunner.query(
            `ALTER TABLE \`routes\` ADD \`accessType\` enum ('unauthenticated', 'authenticated', 'role-based') NOT NULL DEFAULT 'role-based'`
        );
        await queryRunner.query(
            `ALTER TABLE \`user_settings\` ADD CONSTRAINT \`FK_986a2b6d3c05eb4091bb8066f78\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_settings\` DROP FOREIGN KEY \`FK_986a2b6d3c05eb4091bb8066f78\``);
        await queryRunner.query(`ALTER TABLE \`routes\` DROP COLUMN \`accessType\``);
        await queryRunner.query(`ALTER TABLE \`routes\` ADD \`accessType\` tinyint NOT NULL DEFAULT '0'`);
        await queryRunner.query(
            `ALTER TABLE \`routes\` CHANGE \`accessType\` \`unauthenticatedOnly\` tinyint NOT NULL DEFAULT '0'`
        );
        await queryRunner.query(
            `ALTER TABLE \`user_settings\` ADD CONSTRAINT \`FK_986a2b6d3c05eb4091bb8066f78\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }
}
