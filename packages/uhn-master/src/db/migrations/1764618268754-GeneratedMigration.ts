import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1764618268754 implements MigrationInterface {
    name = 'GeneratedMigration1764618268754'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`blueprint_activation\` (\`id\` int NOT NULL AUTO_INCREMENT, \`activatedAt\` datetime NOT NULL, \`deactivatedAt\` datetime NULL, \`activatedBy\` varchar(64) NULL, \`deactivatedBy\` varchar(64) NULL, \`blueprint_id\` int NOT NULL, PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
        await queryRunner.query(`ALTER TABLE \`blueprint\` ADD \`uploadedBy\` varchar(64) NULL`);
        await queryRunner.query(`ALTER TABLE \`blueprint\` ADD \`validationLog\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`blueprint\` ADD \`compileLog\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`blueprint\` ADD \`active\` tinyint NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE \`blueprint\` CHANGE \`metadata\` \`metadata\` json NOT NULL`);
        await queryRunner.query(`ALTER TABLE \`blueprint_activation\` ADD CONSTRAINT \`FK_e59ea9870136192cc5d6391ff8c\` FOREIGN KEY (\`blueprint_id\`) REFERENCES \`blueprint\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`blueprint_activation\` DROP FOREIGN KEY \`FK_e59ea9870136192cc5d6391ff8c\``);
        await queryRunner.query(`ALTER TABLE \`blueprint\` CHANGE \`metadata\` \`metadata\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`blueprint\` DROP COLUMN \`active\``);
        await queryRunner.query(`ALTER TABLE \`blueprint\` DROP COLUMN \`compileLog\``);
        await queryRunner.query(`ALTER TABLE \`blueprint\` DROP COLUMN \`validationLog\``);
        await queryRunner.query(`ALTER TABLE \`blueprint\` DROP COLUMN \`uploadedBy\``);
        await queryRunner.query(`DROP TABLE \`blueprint_activation\``);
    }

}
