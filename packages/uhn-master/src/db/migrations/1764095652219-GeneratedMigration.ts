import { MigrationInterface, QueryRunner } from "typeorm";

export class GeneratedMigration1764095652219 implements MigrationInterface {
    name = 'GeneratedMigration1764095652219'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE \`blueprint\` (\`id\` int NOT NULL AUTO_INCREMENT, \`identifier\` varchar(64) NOT NULL, \`version\` int UNSIGNED NOT NULL, \`name\` varchar(255) NOT NULL, \`zipPath\` varchar(512) NOT NULL, \`checksum\` varchar(64) NULL, \`status\` enum ('uploaded', 'validated', 'compiled', 'installed', 'failed', 'archived') NOT NULL DEFAULT 'uploaded', \`metadata\` json NULL, \`createdAt\` timestamp(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6), \`installedAt\` datetime NULL, UNIQUE INDEX \`UIDX_BLUEPRINT_IDENTIFIER\` (\`identifier\`, \`version\`), PRIMARY KEY (\`id\`)) ENGINE=InnoDB`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX \`UIDX_BLUEPRINT_IDENTIFIER\` ON \`blueprint\``);
        await queryRunner.query(`DROP TABLE \`blueprint\``);
    }

}
