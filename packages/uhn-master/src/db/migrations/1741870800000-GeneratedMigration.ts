import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1741870800000 implements MigrationInterface {
    name = 'GeneratedMigration1741870800000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`user_favorite\` (\`id\` int NOT NULL AUTO_INCREMENT, \`username\` varchar(64) NOT NULL, \`itemKind\` enum ('resource', 'view', 'scene') NOT NULL, \`itemRefId\` varchar(128) NOT NULL, \`sortOrder\` int NOT NULL DEFAULT 0, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), INDEX \`IDX_USER_FAV_USER\` (\`username\`), UNIQUE INDEX \`IDX_USER_FAV_UNIQUE\` (\`username\`, \`itemKind\`, \`itemRefId\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_USER_FAV_UNIQUE\` ON \`user_favorite\``);
        await queryRunner.query(`DROP INDEX \`IDX_USER_FAV_USER\` ON \`user_favorite\``);
        await queryRunner.query(`DROP TABLE \`user_favorite\``);
    }

}
