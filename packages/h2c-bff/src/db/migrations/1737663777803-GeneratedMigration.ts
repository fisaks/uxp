import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1737663777803 implements MigrationInterface {
    name = "GeneratedMigration1737663777803";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            `CREATE TABLE \`houses\` (\`id\` int NOT NULL AUTO_INCREMENT, \`uuid\` char(36) NOT NULL, \`data\` json NOT NULL, \`removed\` tinyint NOT NULL DEFAULT 0, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`updatedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`removedAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`version\` int NOT NULL, UNIQUE INDEX \`IDX_5a47aaa8bc31d505a3b16cad02\` (\`uuid\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_5a47aaa8bc31d505a3b16cad02\` ON \`houses\``);
        await queryRunner.query(`DROP TABLE \`houses\``);
    }
}
