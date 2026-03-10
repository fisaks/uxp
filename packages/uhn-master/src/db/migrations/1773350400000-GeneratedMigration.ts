import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1773350400000 implements MigrationInterface {
    name = 'GeneratedMigration1773350400000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`api_token\` (\`id\` int NOT NULL AUTO_INCREMENT, \`tokenHash\` varchar(64) NOT NULL, \`lastFourChars\` varchar(4) NOT NULL, \`label\` varchar(100) NOT NULL, \`blueprintIdentifier\` varchar(64) NOT NULL, \`createdBy\` varchar(64) NOT NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`lastUsedAt\` datetime NULL, \`revokedAt\` datetime NULL, UNIQUE INDEX \`IDX_API_TOKEN_HASH\` (\`tokenHash\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`IDX_API_TOKEN_HASH\` ON \`api_token\``);
        await queryRunner.query(`DROP TABLE \`api_token\``);
    }

}
