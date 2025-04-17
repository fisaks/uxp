import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1744834220943 implements MigrationInterface {
    name = 'GeneratedMigration1744834220943'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`house_versions\` (\`id\` int NOT NULL AUTO_INCREMENT, \`uuid\` char(36) NOT NULL, \`data\` json NOT NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`label\` varchar(255) NULL, INDEX \`IDX_HOUSE_VERSION_UUID\` (\`uuid\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_HOUSE_VERSION_UUID\` ON \`house_versions\``);
        await queryRunner.query(`DROP TABLE \`house_versions\``);
    }

}
