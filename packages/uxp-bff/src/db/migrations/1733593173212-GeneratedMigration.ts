import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1733593173212 implements MigrationInterface {
    name = "GeneratedMigration1733593173212";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`user_settings\` (\`id\` int NOT NULL AUTO_INCREMENT, \`userId\` int NOT NULL, \`settings\` json NULL, UNIQUE INDEX \`REL_986a2b6d3c05eb4091bb8066f7\` (\`userId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
        await queryRunner.query(
            `ALTER TABLE \`user_settings\` ADD CONSTRAINT \`FK_986a2b6d3c05eb4091bb8066f78\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`user_settings\` DROP FOREIGN KEY \`FK_986a2b6d3c05eb4091bb8066f78\``);
        await queryRunner.query(`DROP INDEX \`REL_986a2b6d3c05eb4091bb8066f7\` ON \`user_settings\``);
        await queryRunner.query(`DROP TABLE \`user_settings\``);
    }
}
